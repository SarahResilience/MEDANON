import React, { useMemo, useState } from 'react';
import { ChevronLeft, Download, Copy, RotateCcw, FileCheck2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useDoc } from '../context/DocumentContext';
import { t } from '../lib/i18n';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { anonymizeText, makePseudonymizer } from '../lib/detectors';
import { exportAnonymizedPdf, buildJoinedText } from '../lib/pdfUtils';

export function Export() {
  const doc = useDoc();
  const { pages, detectionsByPage, rejected, manualBoxes, mode, lang } = doc;
  const [confirmed, setConfirmed] = useState(false);
  const [checks, setChecks] = useState(new Set());
  const [busy, setBusy] = useState(false);

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

  const activeDetections = useMemo(() => {
    const list = [];
    for (const [, dets] of activeByPage.entries()) for (const d of dets) list.push(d);
    return list;
  }, [activeByPage]);

  const pseudoFn = useMemo(() => makePseudonymizer(), []);

  const toggleCheck = (k) => {
    setChecks((prev) => {
      const s = new Set(prev);
      if (s.has(k)) s.delete(k); else s.add(k);
      return s;
    });
  };

  const canExport = confirmed;

  const handleDownload = async () => {
    if (!canExport) return;
    setBusy(true);
    try {
      await exportAnonymizedPdf({
        pages,
        redactionsByPage: activeByPage,
        mode,
        pseudonymFn: pseudoFn,
        filename: 'compte_rendu_ANONYMISE.pdf',
      });
      toast.success(t(lang, 'downloaded'));
    } catch (e) {
      console.error(e);
      toast.error('Export échoué.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!canExport) return;
    const { text, offsets } = buildJoinedText(pages);
    // Rebuild detections in "text offsets" space by scanning active detection values.
    // Simpler: reuse anonymizeText with the full page text + string search of each active detection.
    // We'll create text-space detections by matching value occurrences in the joined text.
    const dets = [];
    for (const d of activeDetections) {
      if (!d.value || d.value === '(manuel)') continue;
      const idx = indexOfCaseInsensitive(text, d.value);
      if (idx >= 0) dets.push({ start: idx, end: idx + d.value.length, value: d.value, category: d.category, label: d.label });
    }
    const cleaned = anonymizeText(text, dets, mode);
    try {
      await navigator.clipboard.writeText(cleaned);
      toast.success(t(lang, 'copied'));
    } catch {
      toast.error('Impossible de copier.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#0F1E36]">{t(lang, 'exportTitle')}</h1>
          <p className="text-sm text-[#64748B] mt-1">{t(lang, 'exportSub')}</p>
        </div>
        <Button variant="ghost" onClick={() => doc.setStep('preview')} data-testid="export-back-btn" className="text-[#475569]">
          <ChevronLeft className="w-4 h-4 mr-1" /> {t(lang, 'back')}
        </Button>
      </div>

      {/* Human check warning */}
      <div className="rounded-2xl border border-[#FBBF24]/50 bg-[#FEF3C7]/50 p-5 mb-5 flex items-start gap-3">
        <div className="mt-0.5 w-9 h-9 rounded-lg bg-[#FBBF24]/20 border border-[#FBBF24]/50 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-[#92400E]" strokeWidth={2.2} />
        </div>
        <div className="flex-1">
          <div className="font-display font-semibold text-[#92400E]">{t(lang, 'humanCheck')}</div>
          <p className="text-sm text-[#78350F] mt-1 leading-relaxed">{t(lang, 'humanCheckBody')}</p>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-2xl bg-white border border-[#E5E0D8] shadow-sm p-5 mb-5">
        <div className="text-[10px] uppercase tracking-widest text-[#475569] font-semibold mb-3">
          {t(lang, 'checklist')}
        </div>
        <ul className="space-y-2.5">
          {['chk1', 'chk2', 'chk3', 'chk4', 'chk5', 'chk6', 'chk7', 'chk8'].map((k) => (
            <li key={k} className="flex items-start gap-3">
              <Checkbox
                id={k}
                data-testid={`checklist-${k}`}
                checked={checks.has(k)}
                onCheckedChange={() => toggleCheck(k)}
                className="mt-0.5"
              />
              <label htmlFor={k} className="text-sm text-[#334155] cursor-pointer select-none leading-relaxed">
                {t(lang, k)}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Confirmation */}
      <div className="rounded-2xl bg-[#0F1E36] text-white p-5 mb-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            id="confirm-review"
            data-testid="confirm-review"
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(!!v)}
            className="mt-0.5 border-white/60 data-[state=checked]:bg-white data-[state=checked]:text-[#0F1E36]"
          />
          <span className="text-sm leading-relaxed">
            <strong className="font-display">{t(lang, 'confirmReview')}</strong>
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Button
          onClick={handleDownload}
          disabled={!canExport || busy}
          data-testid="download-pdf-btn"
          className="bg-[#2C6E49] hover:bg-[#245839] text-white h-12 text-base"
        >
          <Download className="w-4 h-4 mr-2" />
          {t(lang, 'downloadPdf')}
        </Button>
        <Button
          onClick={handleCopy}
          disabled={!canExport}
          variant="outline"
          data-testid="copy-text-btn"
          className="h-12 text-base border-[#0F1E36]/30 hover:bg-[#F4F1EA]"
        >
          <Copy className="w-4 h-4 mr-2" />
          {t(lang, 'copyText')}
        </Button>
      </div>

      {canExport && (
        <div className="rounded-xl bg-[#ECFDF5] border border-[#6EE7B7] p-4 flex items-start gap-3 mb-4">
          <FileCheck2 className="w-5 h-5 text-[#065F46] mt-0.5 flex-shrink-0" strokeWidth={2.2} />
          <p className="text-sm text-[#065F46] leading-relaxed">{t(lang, 'ready')}</p>
        </div>
      )}

      <div className="text-xs text-[#64748B] leading-relaxed">{t(lang, 'disclaimer')}</div>

      <div className="mt-6 flex justify-center">
        <Button variant="ghost" onClick={() => doc.reset()} data-testid="new-doc-btn" className="text-[#475569] gap-2">
          <RotateCcw className="w-4 h-4" /> {t(lang, 'newDoc')}
        </Button>
      </div>
    </div>
  );
}

function indexOfCaseInsensitive(haystack, needle) {
  return haystack.toLowerCase().indexOf(needle.toLowerCase());
}
