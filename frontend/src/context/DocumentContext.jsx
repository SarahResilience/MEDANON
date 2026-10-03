import React, { createContext, useContext, useState, useCallback } from 'react';

const DocCtx = createContext(null);

export function DocumentProvider({ children }) {
  const [step, setStep] = useState('home'); // home | processing | review | preview | export
  const [pages, setPages] = useState([]);
  const [detectionsByPage, setDetectionsByPage] = useState(new Map());
  const [allDetections, setAllDetections] = useState([]); // flat list with pageIndex
  const [rejected, setRejected] = useState(new Set()); // detection ids
  const [manualBoxes, setManualBoxes] = useState([]); // { id, pageIndex, box, category, label }
  const [processingState, setProcessingState] = useState({ stage: 'idle', pageIndex: 0, totalPages: 0, progress: 0 });
  const [mode, setMode] = useState('suppress'); // 'suppress' | 'pseudo'
  const [lang, setLang] = useState('fr');
  const [sourceLabel, setSourceLabel] = useState('');

  const reset = useCallback(() => {
    setStep('home');
    setPages([]);
    setDetectionsByPage(new Map());
    setAllDetections([]);
    setRejected(new Set());
    setManualBoxes([]);
    setProcessingState({ stage: 'idle', pageIndex: 0, totalPages: 0, progress: 0 });
    setMode('suppress');
    setSourceLabel('');
  }, []);

  const toggleReject = useCallback((id) => {
    setRejected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }, []);

  const addManualBox = useCallback((pageIndex, box) => {
    const id = 'manual-' + Math.random().toString(36).slice(2, 9);
    setManualBoxes((prev) => [...prev, {
      id, pageIndex, boxes: [box],
      category: 'other', label: 'Zone manuelle', value: '(manuel)',
    }]);
  }, []);

  const removeManualBox = useCallback((id) => {
    setManualBoxes((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const value = {
    step, setStep,
    pages, setPages,
    detectionsByPage, setDetectionsByPage,
    allDetections, setAllDetections,
    rejected, toggleReject,
    manualBoxes, addManualBox, removeManualBox,
    processingState, setProcessingState,
    mode, setMode,
    lang, setLang,
    sourceLabel, setSourceLabel,
    reset,
  };

  return <DocCtx.Provider value={value}>{children}</DocCtx.Provider>;
}

export function useDoc() {
  const v = useContext(DocCtx);
  if (!v) throw new Error('useDoc must be used inside DocumentProvider');
  return v;
}
