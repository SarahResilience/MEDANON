import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { useDoc } from '../context/DocumentContext';
import { t } from '../lib/i18n';

const STEP_ORDER = ['load', 'ocr', 'detect', 'ready'];

export function Processing() {
  const { processingState, lang, sourceLabel } = useDoc();
  const currentIdx = STEP_ORDER.indexOf(processingState.stage);

  const stepMeta = [
    { key: 'load', label: t(lang, 'stepLoad') },
    { key: 'ocr', label: t(lang, 'stepOCR') },
    { key: 'detect', label: t(lang, 'stepDetect') },
    { key: 'ready', label: t(lang, 'stepReady') },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#6EE7B7] text-[11px] uppercase tracking-widest text-[#065F46] font-medium mb-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Traitement local en cours</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0F1E36] tracking-tight">
            {t(lang, 'processingTitle')}
          </h1>
          {sourceLabel && (
            <p className="mt-2 text-sm text-[#64748B] font-mono">{sourceLabel}</p>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] shadow-sm overflow-hidden">
          {/* Scanning visual */}
          <div className="relative h-24 bg-gradient-to-b from-[#F4F1EA] to-white overflow-hidden border-b border-[#E5E0D8]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[10px] uppercase tracking-widest text-[#94A3B8]">Analyse WebAssembly</div>
            </div>
            <div className="scan-line" />
          </div>

          <ul className="p-6 sm:p-8 space-y-4" data-testid="processing-steps">
            {stepMeta.map((s, i) => {
              const done = i < currentIdx || processingState.stage === 'ready';
              const active = i === currentIdx && processingState.stage !== 'ready';
              return (
                <li key={s.key} className="flex items-start gap-3" data-testid={`processing-step-${s.key}`}>
                  <div className="mt-0.5">
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-[#2C6E49]" strokeWidth={2.2} />
                    ) : active ? (
                      <Loader2 className="w-5 h-5 text-[#0F1E36] animate-spin" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#CBD5E1]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm ${done ? 'text-[#0F1E36] font-medium' : active ? 'text-[#0F1E36] font-medium' : 'text-[#94A3B8]'}`}>
                      {s.label}
                    </div>
                    {active && s.key === 'ocr' && processingState.totalPages > 0 && (
                      <div className="mt-1">
                        <div className="h-1 w-full rounded bg-[#F1F5F9] overflow-hidden">
                          <div
                            className="h-full bg-[#2C6E49] transition-all"
                            style={{ width: `${Math.round(((processingState.pageIndex + processingState.progress) / processingState.totalPages) * 100)}%` }}
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-[#64748B]">
                          Page {processingState.pageIndex + 1} / {processingState.totalPages}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-6 text-center text-xs text-[#64748B] leading-relaxed max-w-md mx-auto">
          Aucun contenu patient n&apos;est envoyé vers un serveur externe. L&apos;OCR et la détection s&apos;exécutent dans votre navigateur.
        </p>
      </div>
    </div>
  );
}
