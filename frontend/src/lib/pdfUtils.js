// Local document processing: PDF rendering, image loading, OCR, text extraction.
// All processing runs client-side.
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import Tesseract from 'tesseract.js';
import jsPDF from 'jspdf';
import { DEMO_TEXT, DEMO_META } from './demoDocument';

// Use the CDN worker for pdfjs (only static, no patient data leaves the device).
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;

const RENDER_DPI_SCALE = 2; // renders PDFs at ~2x for OCR quality
const DEFAULT_LANG = 'fra+eng';

// ---------- File → Pages (canvas + text extraction) ----------
export async function loadFileToPages(file, onProgress = () => {}) {
  const type = file.type || '';
  const name = file.name || 'document';
  if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
    return await loadPdfPages(file, onProgress);
  }
  if (type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(name)) {
    return await loadImagePage(file);
  }
  throw new Error('Unsupported file type: ' + (type || name));
}

async function loadPdfPages(file, onProgress) {
  const arrayBuf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress({ step: 'render', pageIndex: i - 1, totalPages: pdf.numPages });
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_DPI_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    // Try to grab embedded text (for digital PDFs)
    let embeddedText = '';
    let embeddedItems = [];
    try {
      const tc = await page.getTextContent();
      embeddedItems = tc.items.map((it) => {
        // Compute canvas coords from item transform
        const tx = pdfjsLib.Util.transform(viewport.transform, it.transform);
        const x = tx[4];
        const y = tx[5] - it.height * tx[0];
        const w = it.width * tx[0];
        const h = it.height * tx[0];
        return { str: it.str, x, y, w, h };
      });
      embeddedText = embeddedItems.map((it) => it.str).join(' ');
    } catch (e) {
      embeddedText = '';
    }
    pages.push({
      index: i - 1,
      canvas,
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
      width: canvas.width,
      height: canvas.height,
      embeddedText,
      embeddedItems,
      ocrText: '',
      words: [], // to be filled by OCR when needed
    });
  }
  return pages;
}

async function loadImagePage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d').drawImage(img, 0, 0);
  return [{
    index: 0,
    canvas,
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width: canvas.width,
    height: canvas.height,
    embeddedText: '',
    embeddedItems: [],
    ocrText: '',
    words: [],
  }];
}

// ---------- OCR ----------
export async function ocrPages(pages, onProgress = () => {}, lang = DEFAULT_LANG) {
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    // Skip OCR if we already have plenty of embedded text
    if ((p.embeddedText || '').replace(/\s/g, '').length > 200) {
      // Convert embedded items into "words"
      p.ocrText = p.embeddedText;
      p.words = (p.embeddedItems || []).flatMap((it) => tokenizeItem(it));
      onProgress({ step: 'ocr', pageIndex: i, progress: 1, totalPages: pages.length });
      continue;
    }
    onProgress({ step: 'ocr', pageIndex: i, progress: 0, totalPages: pages.length });
    const { data } = await Tesseract.recognize(p.canvas, lang, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress({ step: 'ocr', pageIndex: i, progress: m.progress, totalPages: pages.length });
        }
      },
    });
    p.ocrText = data.text || '';
    const words = [];
    (data.words || []).forEach((w) => {
      if (!w.text || !w.bbox) return;
      words.push({
        str: w.text,
        x: w.bbox.x0, y: w.bbox.y0,
        w: w.bbox.x1 - w.bbox.x0, h: w.bbox.y1 - w.bbox.y0,
      });
    });
    p.words = words;
    onProgress({ step: 'ocr', pageIndex: i, progress: 1, totalPages: pages.length });
  }
  return pages;
}

function tokenizeItem(it) {
  // Split a PDF text item into rough word tokens with proportional widths
  const parts = it.str.split(/(\s+)/);
  const totalNonSpace = parts.filter((p) => !/^\s+$/.test(p)).join('').length || 1;
  let offset = 0;
  const out = [];
  for (const p of parts) {
    const isSpace = /^\s+$/.test(p);
    const len = p.length;
    const wRatio = len / (it.str.length || 1);
    const startRatio = offset / (it.str.length || 1);
    if (!isSpace && p.trim()) {
      out.push({
        str: p,
        x: it.x + it.w * startRatio,
        y: it.y,
        w: it.w * wRatio,
        h: it.h,
      });
    }
    offset += len;
  }
  return out;
}

// ---------- Map detections (offsets in full text) → per-page word boxes ----------
// Rebuild a joined text with per-word offset positions, then for each detection
// range find overlapping words. Simpler + robust than exact substring matching.
export function attachBoxesToDetections(pages, detectionsGlobal, textOffsets) {
  // textOffsets: [{ pageIndex, wordIndex, start, end }]
  const byPage = new Map(); // pageIndex -> [detections with box]
  for (const det of detectionsGlobal) {
    const overlapping = textOffsets.filter((o) => o.end > det.start && o.start < det.end);
    // Group by page
    const groups = new Map();
    for (const o of overlapping) {
      if (!groups.has(o.pageIndex)) groups.set(o.pageIndex, []);
      groups.get(o.pageIndex).push(o);
    }
    for (const [pageIndex, list] of groups.entries()) {
      const page = pages[pageIndex];
      const words = list.map((o) => page.words[o.wordIndex]).filter(Boolean);
      if (words.length === 0) continue;
      // Bounding box grouped by line (y proximity)
      const lines = groupByLine(words);
      const boxes = lines.map((line) => bboxOf(line));
      const list2 = byPage.get(pageIndex) || [];
      list2.push({ ...det, pageIndex, boxes });
      byPage.set(pageIndex, list2);
    }
  }
  return byPage;
}

export function buildJoinedText(pages) {
  let text = '';
  const offsets = [];
  for (let pi = 0; pi < pages.length; pi++) {
    const p = pages[pi];
    for (let wi = 0; wi < p.words.length; wi++) {
      const w = p.words[wi];
      const start = text.length;
      text += w.str;
      const end = text.length;
      offsets.push({ pageIndex: pi, wordIndex: wi, start, end });
      // Add a separator: newline at big y-jump, else space
      const nextW = p.words[wi + 1];
      if (nextW && Math.abs(nextW.y - w.y) > (w.h || 12) * 0.8) {
        text += '\n';
      } else {
        text += ' ';
      }
    }
    text += '\n\n';
  }
  return { text, offsets };
}

function groupByLine(words) {
  const sorted = [...words].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const w of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - w.y) < Math.max(6, (w.h || 10) * 0.6)) {
      last.push(w);
    } else {
      lines.push([w]);
    }
  }
  return lines;
}

function bboxOf(words) {
  const x0 = Math.min(...words.map((w) => w.x));
  const y0 = Math.min(...words.map((w) => w.y));
  const x1 = Math.max(...words.map((w) => w.x + w.w));
  const y1 = Math.max(...words.map((w) => w.y + w.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ---------- Anonymized PDF export ----------
// Draws the redacted (or pseudonymized) canvases and rasterizes them into a new PDF.
// Because the pages are drawn as flattened images, the original text is unrecoverable.
export async function exportAnonymizedPdf({ pages, redactionsByPage, mode, pseudonymFn, filename = 'compte_rendu_ANONYMISE.pdf' }) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    // Compose canvas: original page + redaction rects
    const composed = document.createElement('canvas');
    composed.width = p.width;
    composed.height = p.height;
    const ctx = composed.getContext('2d');
    ctx.drawImage(p.canvas, 0, 0);
    const rects = redactionsByPage.get(i) || [];
    for (const r of rects) {
      const boxes = r.boxes || [];
      for (const b of boxes) {
        drawRedaction(ctx, b, r, mode, pseudonymFn);
      }
    }
    const jpeg = composed.toDataURL('image/jpeg', 0.9);
    if (i > 0) pdf.addPage();
    // Fit page to A4 while preserving aspect
    const ar = p.width / p.height;
    let w = pageW, h = pageW / ar;
    if (h > pageH) { h = pageH; w = pageH * ar; }
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    pdf.addImage(jpeg, 'JPEG', x, y, w, h);
  }
  // Sanitize metadata
  pdf.setProperties({ title: 'Document anonymisé', subject: '', author: '', keywords: '', creator: 'MedAnon Local' });
  pdf.save(filename);
}

function drawRedaction(ctx, box, det, mode, pseudonymFn) {
  const padX = 3, padY = 2;
  const x = box.x - padX;
  const y = box.y - padY;
  const w = box.w + padX * 2;
  const h = box.h + padY * 2;
  if (mode === 'pseudo') {
    // White fill + label
    ctx.save();
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    const label = `[${pseudonymFn(det)}]`;
    const fontSize = Math.max(9, Math.min(h * 0.72, 14));
    ctx.fillStyle = '#0F1E36';
    ctx.font = `500 ${fontSize}px 'IBM Plex Mono', monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 4, y + h / 2);
    ctx.restore();
  } else {
    // Solid black fill — non-recoverable because pages are flattened to JPEG.
    ctx.save();
    ctx.fillStyle = '#0F1E36';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
}

// ---------- Demo document generator (canvas-based) ----------
// Renders DEMO_TEXT onto a canvas and produces "words" with exact bboxes,
// so we can skip Tesseract entirely for the demo — instant experience.
export function buildDemoPages() {
  const W = DEMO_META.pageWidth;
  const H = DEMO_META.pageHeight;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0F1E36';
  const fontFamily = "'IBM Plex Sans', -apple-system, sans-serif";

  const marginX = 64;
  let y = 72;
  const lineH = 20;
  const words = [];
  const lines = DEMO_TEXT.split('\n');
  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];
    let bold = false;
    let bigger = false;
    // Style headings
    if (/^[A-ZÉÈÀÊÂ ]{3,}$/.test(line.trim()) && line.trim().length < 60) {
      bold = true;
      bigger = true;
    }
    if (li === 0 || li === 1 || li === 2) {
      bold = li === 0;
      bigger = li === 0;
    }
    ctx.font = `${bold ? 600 : 400} ${bigger ? 16 : 12}px ${fontFamily}`;
    // Word positions
    let x = marginX;
    const tokens = line.split(/(\s+)/);
    for (const tok of tokens) {
      if (!tok) continue;
      const measure = ctx.measureText(tok);
      if (!/^\s+$/.test(tok)) {
        ctx.fillText(tok, x, y);
        words.push({ str: tok, x, y: y - (bigger ? 14 : 11), w: measure.width, h: bigger ? 18 : 14 });
      }
      x += measure.width;
    }
    y += bigger ? lineH + 4 : lineH;
    if (y > H - 60) break;
  }
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  return [{
    index: 0,
    canvas,
    dataUrl,
    width: W,
    height: H,
    embeddedText: DEMO_TEXT,
    embeddedItems: [],
    ocrText: DEMO_TEXT,
    words,
  }];
}
