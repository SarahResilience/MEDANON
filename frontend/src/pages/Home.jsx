import React, { useRef } from 'react';
import { Camera, FileUp, Beaker, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useDoc } from '../context/DocumentContext';
import { t } from '../lib/i18n';
import { loadFileToPages, ocrPages, buildJoinedText, attachBoxesToDetections, buildDemoPages } from '../lib/pdfUtils';
import { detectPII } from '../lib/detectors';

export function Home() {
  const doc = useDoc();
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const dropRef = useRef(null);
  const { lang } = doc;

  const handleFile = async (file) => {
    if (!file) return;
    const ok = /pdf|image\/(jpeg|jpg|png|webp|heic|heif)/i.test(file.type) || /\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(file.name);
    if (!ok) { toast.error(t(lang, 'unsupportedFile')); return; }
    doc.setSourceLabel(file.name);
    doc.setStep('processing');
    doc.setProcessingState({ stage: 'load', pageIndex: 0, totalPages: 0, progress: 0 });
    try {
      const pages = await loadFileToPages(file, (p) => {
        doc.setProcessingState({ stage: 'load', pageIndex: p.pageIndex, totalPages: p.totalPages, progress: 0 });
      });
      doc.setProcessingState({ stage: 'ocr', pageIndex: 0, totalPages: pages.length, progress: 0 });
      await ocrPages(pages, (p) => {
        doc.setProcessingState({ stage: 'ocr', pageIndex: p.pageIndex, totalPages: p.totalPages, progress: p.progress });
      });
      finalizeDetections(pages);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du traitement du document.');
      doc.setStep('home');
    }
  };

  const finalizeDetections = (pages) => {
    doc.setProcessingState({ stage: 'detect', pageIndex: 0, totalPages: pages.length, progress: 0 });
    const { text, offsets } = buildJoinedText(pages);
    const flat = detectPII(text);
    const byPage = attachBoxesToDetections(pages, flat, offsets);
    doc.setPages(pages);
    // Build a flat list with pageIndex + boxes for the panel
    const flatWithPage = [];
    for (const [pi, list] of byPage.entries()) {
      for (const d of list) flatWithPage.push(d);
    }
    doc.setDetectionsByPage(byPage);
    doc.setAllDetections(flatWithPage);
    doc.setProcessingState({ stage: 'ready', pageIndex: pages.length - 1, totalPages: pages.length, progress: 1 });
    setTimeout(() => doc.setStep('review'), 500);
  };

  const useDemo = () => {
    doc.setSourceLabel('Dossier fictif — Sophie Martin');
    doc.setStep('processing');
    // Fast-forward through steps for a smooth demo experience
    doc.setProcessingState({ stage: 'load', pageIndex: 0, totalPages: 1, progress: 0 });
    setTimeout(() => {
      const pages = buildDemoPages();
      doc.setProcessingState({ stage: 'ocr', pageIndex: 0, totalPages: 1, progress: 0.5 });
      setTimeout(() => {
        doc.setProcessingState({ stage: 'ocr', pageIndex: 0, totalPages: 1, progress: 1 });
        finalizeDetections(pages);
      }, 700);
    }, 500);
  };

  const onDrop = (e) => {
    e.preventDefault();
    dropRef.current?.classList.remove('ring-2', 'ring-[#0F1E36]');
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
      <div className="mb-10 sm:mb-14 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F1E36]/5 border border-[#0F1E36]/10 text-[11px] uppercase tracking-widest text-[#0F1E36] font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.4} />
          <span>Analyse locale — votre document ne quitte pas cet appareil</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#0F1E36] leading-[1.05] tracking-tight">
          {t(doc.lang, 'tagline')}
        </h1>
        <p className="mt-5 text-[#475569] text-base sm:text-lg leading-relaxed max-w-2xl">
          {t(doc.lang, 'homeSubtitle')}
        </p>
      </div>

      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add('ring-2', 'ring-[#0F1E36]'); }}
        onDragLeave={() => dropRef.current?.classList.remove('ring-2', 'ring-[#0F1E36]')}
        onDrop={onDrop}
        className="rounded-2xl transition-all"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Camera */}
          <ActionCard
            testid="action-camera"
            icon={<Camera className="w-6 h-6" />}
            title={t(doc.lang, 'takePhoto')}
            desc={t(doc.lang, 'takePhotoDesc')}
            onClick={() => cameraRef.current?.click()}
            accent="bg-[#0F1E36] text-[#FBF9F5]"
          />
          {/* Import */}
          <ActionCard
            testid="action-import"
            icon={<FileUp className="w-6 h-6" />}
            title={t(doc.lang, 'importDoc')}
            desc={t(doc.lang, 'importDocDesc')}
            onClick={() => fileRef.current?.click()}
            accent="bg-white text-[#0F1E36] border border-[#0F1E36]/15"
          />
          {/* Demo */}
          <ActionCard
            testid="action-demo"
            icon={<Beaker className="w-6 h-6" />}
            title={t(doc.lang, 'tryDemo')}
            desc={t(doc.lang, 'tryDemoDesc')}
            onClick={useDemo}
            accent="bg-[#2C6E49] text-white"
          />
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-[#CBD5E1] p-6 sm:p-8 text-center text-[#64748B] bg-white/40">
          <div className="text-sm">
            <span className="font-medium text-[#0F1E36]">{t(doc.lang, 'dropHere')}</span> {t(doc.lang, 'orClickBrowse')}
          </div>
          <div className="mt-2 text-xs">PDF · JPG · PNG</div>
        </div>
      </div>

      <input
        ref={fileRef} type="file" accept="application/pdf,image/*"
        className="hidden" data-testid="file-input"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={cameraRef} type="file" accept="image/*" capture="environment"
        className="hidden" data-testid="camera-input"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="mt-10 flex items-center gap-2 text-xs text-[#64748B]">
        <Lock className="w-3.5 h-3.5" />
        <span>{t(doc.lang, 'disclaimer')}</span>
      </div>
    </div>
  );
}

function ActionCard({ testid, icon, title, desc, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className="group text-left rounded-2xl bg-white border border-[#E5E0D8] p-6 sm:p-7 hover:shadow-lg hover:-translate-y-0.5 hover:border-[#0F1E36]/30 transition-all focus-ring grain-bg"
    >
      <div className={`w-12 h-12 rounded-xl ${accent} flex items-center justify-center mb-5 transition-transform group-hover:scale-105`}>
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg text-[#0F1E36] mb-1.5">{title}</h3>
      <p className="text-sm text-[#475569] leading-relaxed">{desc}</p>
    </button>
  );
}
