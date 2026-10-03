import React, { useState } from 'react';
import { Lock, Globe } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';
import { LANGS, t } from '../lib/i18n';
import { useDoc } from '../context/DocumentContext';

export function Header() {
  const { lang, setLang, reset } = useDoc();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  return (
    <header
      className="sticky top-0 z-40 border-b border-[#E5E0D8] bg-[#FBF9F5]/80 backdrop-blur-md"
      data-testid="app-header"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 py-3">
        <button
          onClick={reset}
          data-testid="header-home-btn"
          className="flex items-center gap-2.5 group focus-ring rounded-md"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0F1E36] text-[#FBF9F5] flex items-center justify-center font-display font-semibold text-sm shadow-sm">
            M
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="font-display font-semibold text-[15px] text-[#0F1E36]">MedAnon Local</span>
            <span className="text-[10px] uppercase tracking-widest text-[#64748B]">Suisse · Prototype</span>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
            <DialogTrigger asChild>
              <button
                data-testid="privacy-badge-btn"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#065F46] border border-[#6EE7B7] hover:bg-[#D1FAE5] transition-colors focus-ring"
              >
                <Lock className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>{t(lang, 'privacyBadge')}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-[#0F1E36]">
                  {t(lang, 'privacyModalTitle')}
                </DialogTitle>
                <DialogDescription className="text-[#334155] text-sm leading-relaxed pt-2">
                  {t(lang, 'privacyModalBody')}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 rounded-lg bg-[#F4F1EA] border border-[#E5E0D8] p-3 text-xs text-[#475569] leading-relaxed">
                {t(lang, 'disclaimer')}
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-testid="lang-switcher-btn"
                className="text-[#0F1E36] hover:bg-[#F4F1EA] gap-1.5 h-8 px-2"
              >
                <Globe className="w-4 h-4" />
                <span className="uppercase text-xs font-semibold">{lang}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {LANGS.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  data-testid={`lang-option-${l.code}`}
                  onClick={() => setLang(l.code)}
                  className={lang === l.code ? 'bg-[#F4F1EA] font-medium' : ''}
                >
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
