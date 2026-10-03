import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Filter, MousePointer2, Sparkles, X, Check } from 'lucide-react';
import { useDoc } from '../context/DocumentContext';
import { t } from '../lib/i18n';
import { CATEGORY_META } from '../lib/detectors';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Toggle } from '../components/ui/toggle';

const CAT_ORDER = ['identity', 'contact', 'dates', 'admin', 'healthpro', 'other'];

export function Review() {
  const doc = useDoc();
  const { pages, detectionsByPage, rejected, toggleReject, manualBoxes, addManualBox, removeManualBox, lang } = doc;
  const [pageIdx, setPageIdx] = useState(0);
  const [catFilter, setCatFilter] = useState(new Set(CAT_ORDER));
  const [manualMode, setManualMode] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  const page = pages[pageIdx];
  const pageDetections = useMemo(() => {
    return (detectionsByPage.get(pageIdx) || []).filter((d) => catFilter.has(d.category));
  }, [detectionsByPage, pageIdx, catFilter]);

  const pageManualBoxes = manualBoxes.filter((m) => m.pageIndex === pageIdx);

  useEffect(() => {
    const onResize = () => {
      if (imgRef.current) {
        setDisplaySize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pageIdx, pages.length]);

  const totalDetections = useMemo(() => {
    let count = 0;
    for (const [, list] of detectionsByPage.entries()) count += list.length;
    return count + manualBoxes.length;
  }, [detectionsByPage, manualBoxes]);

  const activeDetectionsCount = useMemo(() => {
    let count = 0;
    for (const [, list] of detectionsByPage.entries()) {
      for (const d of list) if (!rejected.has(d.id)) count++;
    }
    return count + manualBoxes.length;
  }, [detectionsByPage, rejected, manualBoxes]);

  if (!page) return null;

  const scaleX = displaySize.w / page.width || 0;
  const scaleY = displaySize.h / page.height || 0;

  const startDrag = (e) => {
    if (!manualMode) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scaleX;
    const y = (e.clientY - rect.top) / scaleY;
    setDragging({ x, y, w: 0, h: 0, startX: x, startY: y });
  };
  const moveDrag = (e) => {
    if (!dragging) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scaleX;
    const y = (e.clientY - rect.top) / scaleY;
    setDragging({
      x: Math.min(x, dragging.startX),
      y: Math.min(y, dragging.startY),
      w: Math.abs(x - dragging.startX),
      h: Math.abs(y - dragging.startY),
      startX: dragging.startX, startY: dragging.startY,
    });
  };
  const endDrag = () => {
    if (dragging && dragging.w > 8 && dragging.h > 8) {
      addManualBox(pageIdx, { x: dragging.x, y: dragging.y, w: dragging.w, h: dragging.h });
    }
    setDragging(null);
  };

  const toggleCat = (c) => {
    setCatFilter((prev) => {
      const s = new Set(prev);
      if (s.has(c)) s.delete(c); else s.add(c);
      return s;
    });
  };

  const jumpTo = (det) => {
    setFocusId(det.id);
    if (det.boxes?.[0] && wrapRef.current) {
      const y = det.boxes[0].y * scaleY;
      wrapRef.current.scrollTo({ top: Math.max(0, y - 120), behavior: 'smooth' });
    }
    setTimeout(() => setFocusId(null), 1600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#0F1E36]">{t(lang, 'reviewTitle')}</h1>
          <p className="text-sm text-[#64748B] mt-0.5">{doc.sourceLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => doc.reset()} data-testid="review-back-btn" className="text-[#475569]">
            <ChevronLeft className="w-4 h-4 mr-1" /> {t(lang, 'back')}
          </Button>
          <Button
            onClick={() => doc.setStep('preview')}
            data-testid="review-continue-btn"
            className="bg-[#0F1E36] hover:bg-[#0F1E36]/90 text-white"
          >
            {t(lang, 'continue')} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Document viewer */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] shadow-sm p-3 sm:p-4">
            {pages.length > 1 && (
              <div className="flex items-center justify-between mb-3 px-2">
                <Button variant="ghost" size="sm" disabled={pageIdx === 0} onClick={() => setPageIdx((i) => i - 1)} data-testid="page-prev-btn">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-mono text-[#475569]">{t(lang, 'page')} {pageIdx + 1} / {pages.length}</span>
                <Button variant="ghost" size="sm" disabled={pageIdx === pages.length - 1} onClick={() => setPageIdx((i) => i + 1)} data-testid="page-next-btn">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div
              ref={wrapRef}
              className="relative overflow-auto bg-[#F4F1EA] rounded-lg max-h-[calc(100vh-260px)] border border-[#E5E0D8]"
              onMouseDown={startDrag}
              onMouseMove={moveDrag}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
              style={{ cursor: manualMode ? 'crosshair' : 'default' }}
            >
              <div className="relative inline-block">
                <img
                  ref={imgRef}
                  src={page.dataUrl}
                  alt="Document"
                  className="block max-w-full h-auto"
                  onLoad={(e) => setDisplaySize({ w: e.target.clientWidth, h: e.target.clientHeight })}
                  draggable={false}
                />
                {/* Detection overlays */}
                {pageDetections.map((d) => (
                  d.boxes.map((b, bi) => {
                    const meta = CATEGORY_META[d.category];
                    const isRejected = rejected.has(d.id);
                    const isFocused = focusId === d.id;
                    return (
                      <button
                        key={`${d.id}-${bi}`}
                        onClick={() => toggleReject(d.id)}
                        data-testid={`highlight-${d.id}`}
                        title={`${d.label}: ${d.value}`}
                        className={`absolute rounded pii-pulse transition-all ${isFocused ? 'ring-2 ring-[#0F1E36] scale-105' : ''}`}
                        style={{
                          left: b.x * scaleX,
                          top: b.y * scaleY,
                          width: b.w * scaleX,
                          height: b.h * scaleY,
                          backgroundColor: isRejected ? 'transparent' : meta.colorBg,
                          border: `1.5px ${isRejected ? 'dashed' : 'solid'} ${isRejected ? '#94A3B8' : meta.colorBorder}`,
                          opacity: isRejected ? 0.4 : 0.85,
                        }}
                      />
                    );
                  })
                ))}
                {/* Manual boxes */}
                {pageManualBoxes.map((m) => {
                  const b = m.boxes[0];
                  return (
                    <button
                      key={m.id}
                      onClick={() => removeManualBox(m.id)}
                      data-testid={`manual-box-${m.id}`}
                      title="Cliquer pour retirer"
                      className="absolute rounded bg-[#0F1E36]/70 hover:bg-[#DC2626]/70 border border-[#0F1E36] transition-colors"
                      style={{
                        left: b.x * scaleX, top: b.y * scaleY,
                        width: b.w * scaleX, height: b.h * scaleY,
                      }}
                    />
                  );
                })}
                {/* Live drag preview */}
                {dragging && dragging.w > 0 && (
                  <div
                    className="absolute rounded border-2 border-dashed border-[#0F1E36] bg-[#0F1E36]/20 pointer-events-none"
                    style={{
                      left: dragging.x * scaleX, top: dragging.y * scaleY,
                      width: dragging.w * scaleX, height: dragging.h * scaleY,
                    }}
                  />
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between px-2 gap-3 flex-wrap">
              <Toggle
                pressed={manualMode}
                onPressedChange={setManualMode}
                data-testid="manual-mode-toggle"
                className="data-[state=on]:bg-[#0F1E36] data-[state=on]:text-white gap-1.5"
              >
                <MousePointer2 className="w-4 h-4" />
                {t(lang, 'addManual')}
              </Toggle>
              {manualMode && (
                <span className="text-xs text-[#64748B]">{t(lang, 'manualHint')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] shadow-sm overflow-hidden lg:sticky lg:top-20">
            <div className="p-5 border-b border-[#E5E0D8] bg-[#F4F1EA]/50">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#475569] font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> {t(lang, 'detectedTitle')}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold text-[#0F1E36]" data-testid="detected-count">
                  {activeDetectionsCount}
                </span>
                <span className="text-xs text-[#64748B]">/ {totalDetections} au total</span>
              </div>
            </div>

            <div className="p-4 border-b border-[#E5E0D8]">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#475569] font-semibold mb-2">
                <Filter className="w-3 h-3" /> Catégories
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CAT_ORDER.map((c) => {
                  const meta = CATEGORY_META[c];
                  const active = catFilter.has(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleCat(c)}
                      data-testid={`filter-${c}`}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${active ? '' : 'opacity-40 grayscale'}`}
                      style={{
                        backgroundColor: meta.colorBg,
                        color: meta.colorText,
                        borderColor: meta.colorBorder,
                      }}
                    >
                      {t(lang, categoryLabelKey(c))}
                    </button>
                  );
                })}
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-380px)]">
              <ul className="divide-y divide-[#F1F5F9]" data-testid="detections-list">
                {pageDetections.length === 0 && (
                  <li className="p-6 text-sm text-[#64748B] text-center">
                    Aucune détection sur cette page (avec les filtres actuels).
                  </li>
                )}
                {pageDetections.map((d) => {
                  const meta = CATEGORY_META[d.category];
                  const isRejected = rejected.has(d.id);
                  return (
                    <li key={d.id} data-testid={`detection-item-${d.id}`}>
                      <div className="p-3 flex items-start gap-3 hover:bg-[#FBF9F5]">
                        <button
                          onClick={() => jumpTo(d)}
                          className="flex-1 text-left focus-ring rounded"
                          data-testid={`detection-jump-${d.id}`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: meta.colorBorder, color: meta.colorText, backgroundColor: meta.colorBg }}>
                              {d.label}
                            </Badge>
                          </div>
                          <div className={`text-sm break-all ${isRejected ? 'line-through text-[#94A3B8]' : 'text-[#0F1E36]'}`}>
                            {truncate(d.value, 60)}
                          </div>
                        </button>
                        <button
                          onClick={() => toggleReject(d.id)}
                          data-testid={`detection-toggle-${d.id}`}
                          className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors ${isRejected ? 'bg-white border-[#CBD5E1] text-[#94A3B8]' : 'bg-[#0F1E36] border-[#0F1E36] text-white'}`}
                          title={isRejected ? t(lang, 'accept') : t(lang, 'reject')}
                        >
                          {isRejected ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                      </div>
                    </li>
                  );
                })}
                {pageManualBoxes.map((m) => (
                  <li key={m.id} className="p-3 flex items-center justify-between hover:bg-[#FBF9F5]">
                    <div>
                      <Badge variant="outline" className="text-[10px] mb-0.5">Manuel</Badge>
                      <div className="text-sm text-[#0F1E36]">Zone dessinée</div>
                    </div>
                    <button onClick={() => removeManualBox(m.id)} className="text-[#94A3B8] hover:text-[#DC2626]" data-testid={`manual-remove-${m.id}`}>
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

function categoryLabelKey(c) {
  return {
    identity: 'catIdentity',
    contact: 'catContact',
    dates: 'catDates',
    admin: 'catAdmin',
    healthpro: 'catHealthPro',
    other: 'catOther',
  }[c];
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
