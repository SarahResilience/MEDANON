import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDoc } from '../context/DocumentContext';
import { t } from '../lib/i18n';
import { Button } from '../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { makePseudonymizer, CATEGORY_META } from '../lib/detectors';

export function Preview() {
  const doc = useDoc();
  const { pages, detectionsByPage, rejected, manualBoxes, mode, setMode, lang } = doc;
  const [pageIdx, setPageIdx] = useState(0);

  const page = pages[pageIdx];

  const activeByPage = useMemo(() => {
    const m = new Map();
    for (const [pi, list] of detectionsByPage.entries()) {
      m.set(pi, list.filter((d) => !rejected.has(d.id)));
    }
    for (const mb of manualBoxes) {
      const arr = m.get(mb.pageIndex) || [];
      arr.push(mb);
      m.set(mb.pageIndex, arr);
    }
    return m;
  }, [detectionsByPage, rejected, manualBoxes]);

  const pseudoFn = useMemo(() => {
    const fn = makePseudonymizer();
    // Warm up so counters are stable across renders for demo consistency:
    // iterate over all detections in a deterministic order.
    const all = [];
    for (const [, list] of activeByPage.entries()) for (const d of list) all.push(d);
    all.sort((a, b) => a.pageIndex - b.pageIndex);
    return fn;
  }, [activeByPage]);

  if (!page) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#0F1E36]">{t(lang, 'previewTitle')}</h1>
          <p className="text-sm text-[#64748B] mt-0.5">{doc.sourceLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => doc.setStep('review')} data-testid="preview-back-btn" className="text-[#475569]">
            <ChevronLeft className="w-4 h-4 mr-1" /> {t(lang, 'back')}
          </Button>
          <Button
            onClick={() => doc.setStep('export')}
            data-testid="preview-continue-btn"
            className="bg-[#0F1E36] hover:bg-[#0F1E36]/90 text-white"
          >
            {t(lang, 'anonymize')} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="mb-5 rounded-2xl bg-white border border-[#E5E0D8] p-5">
        <div className="text-[10px] uppercase tracking-widest text-[#475569] font-semibold mb-3">
          {t(lang, 'modeTitle')}
        </div>
        <RadioGroup value={mode} onValueChange={setMode} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label
            htmlFor="mode-suppress"
            className={`rounded-xl border p-4 cursor-pointer transition-all ${mode === 'suppress' ? 'border-[#0F1E36] bg-[#F4F1EA]' : 'border-[#E5E0D8] hover:border-[#0F1E36]/40'}`}
            data-testid="mode-suppress-card"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="suppress" id="mode-suppress" data-testid="mode-suppress-radio" />
              <div className="flex-1">
                <div className="font-medium text-[#0F1E36] flex items-center gap-2">
                  {t(lang, 'modeSuppress')}
                  <span className="text-[10px] uppercase tracking-widest bg-[#0F1E36] text-white px-1.5 py-0.5 rounded">Recommandé</span>
                </div>
                <div className="text-xs text-[#475569] mt-1 leading-relaxed">{t(lang, 'modeSuppressDesc')}</div>
              </div>
            </div>
          </label>
          <label
            htmlFor="mode-pseudo"
            className={`rounded-xl border p-4 cursor-pointer transition-all ${mode === 'pseudo' ? 'border-[#0F1E36] bg-[#F4F1EA]' : 'border-[#E5E0D8] hover:border-[#0F1E36]/40'}`}
            data-testid="mode-pseudo-card"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="pseudo" id="mode-pseudo" data-testid="mode-pseudo-radio" />
              <div className="flex-1">
                <div className="font-medium text-[#0F1E36]">{t(lang, 'modePseudo')}</div>
                <div className="text-xs text-[#475569] mt-1 leading-relaxed">{t(lang, 'modePseudoDesc')}</div>
              </div>
            </div>
          </label>
        </RadioGroup>
      </div>

      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <Button variant="ghost" size="sm" disabled={pageIdx === 0} onClick={() => setPageIdx((i) => i - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-mono text-[#475569]">{t(lang, 'page')} {pageIdx + 1} / {pages.length}</span>
          <Button variant="ghost" size="sm" disabled={pageIdx === pages.length - 1} onClick={() => setPageIdx((i) => i + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PagePanel title={t(lang, 'before')} page={page} rects={[]} mode="none" pseudoFn={pseudoFn} isAfter={false} />
        <PagePanel
          title={t(lang, 'after')}
          page={page}
          rects={activeByPage.get(pageIdx) || []}
          mode={mode}
          pseudoFn={pseudoFn}
          isAfter={true}
        />
      </div>
    </div>
  );
}

function PagePanel({ title, page, rects, mode, pseudoFn, isAfter }) {
  const imgRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const onResize = () => {
      if (imgRef.current) setSize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const scaleX = size.w / page.width || 0;
  const scaleY = size.h / page.height || 0;

  return (
    <div className="rounded-2xl bg-white border border-[#E5E0D8] shadow-sm overflow-hidden" data-testid={`preview-panel-${isAfter ? 'after' : 'before'}`}>
      <div className={`px-4 py-2.5 text-[11px] uppercase tracking-widest font-semibold flex items-center justify-between ${isAfter ? 'bg-[#0F1E36] text-white' : 'bg-[#F4F1EA] text-[#475569]'}`}>
        <span>{title}</span>
        {isAfter && rects.length > 0 && (
          <span className="text-[10px] font-mono opacity-80">{rects.length} zone{rects.length > 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="relative bg-[#F4F1EA] overflow-auto max-h-[70vh]">
        <div className="relative inline-block">
          <img ref={imgRef} src={page.dataUrl} alt="" className="block max-w-full h-auto"
            onLoad={(e) => setSize({ w: e.target.clientWidth, h: e.target.clientHeight })}
            draggable={false}
          />
          {isAfter && rects.map((r) => (
            (r.boxes || []).map((b, bi) => (
              <RedactedOverlay key={`${r.id}-${bi}`} b={b} scaleX={scaleX} scaleY={scaleY} det={r} mode={mode} pseudoFn={pseudoFn} />
            ))
          ))}
        </div>
      </div>
    </div>
  );
}

function RedactedOverlay({ b, scaleX, scaleY, det, mode, pseudoFn }) {
  if (mode === 'pseudo') {
    return (
      <div
        className="absolute flex items-center justify-start px-1 rounded bg-[#F1F5F9] border border-[#94A3B8] text-[#0F1E36] font-mono text-[11px] overflow-hidden whitespace-nowrap"
        style={{ left: b.x * scaleX, top: b.y * scaleY, width: b.w * scaleX, height: b.h * scaleY }}
        title={det.value}
      >
        [{pseudoFn(det)}]
      </div>
    );
  }
  return (
    <div
      className="absolute bg-[#0F1E36] rounded-sm"
      style={{ left: (b.x - 2) * scaleX, top: (b.y - 1) * scaleY, width: (b.w + 4) * scaleX, height: (b.h + 2) * scaleY }}
    />
  );
}
