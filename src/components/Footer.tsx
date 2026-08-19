import React from 'react';
import { ShieldCheck, Cpu, Lock, Sparkles, Terminal, FileCode, CheckCircle2 } from 'lucide-react';
import { AppMode } from '../types';

interface FooterProps {
  appMode: AppMode;
  isDarkMode: boolean;
  onSwitchMode?: (mode: AppMode) => void;
}

export const Footer: React.FC<FooterProps> = ({ appMode, isDarkMode, onSwitchMode }) => {
  return (
    <footer
      id="szip-main-footer"
      className={`border-t select-none py-4 px-4 sm:px-6 transition-colors ${
        isDarkMode
          ? 'bg-slate-950/80 border-slate-850 text-slate-400'
          : 'bg-slate-50/90 border-slate-200 text-slate-600'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand Identity & Creator */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm tracking-tight text-slate-900 dark:text-white">
              szip
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              crafted with precision by{' '}
              <a
                href="https://screlia.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                title="screlia labs web sitesini ziyaret et (https://screlia.netlify.app)"
                className="text-slate-800 dark:text-slate-200 font-semibold hover:text-blue-500 underline decoration-blue-500/30 underline-offset-2 transition-colors inline-flex items-center gap-1"
              >
                <span>screlia labs</span>
              </a>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
              v2.4.0
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              %100 Yerel & Gizli
            </span>
          </div>
        </div>

        {/* Center/Right: Feature Tags & SEO Value */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-blue-400" />
            24+ Format Desteği
          </span>
          <span className="hidden sm:inline text-slate-400 dark:text-slate-700">•</span>
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-400" />
            AES-256 Şifreleme
          </span>
          <span className="hidden sm:inline text-slate-400 dark:text-slate-700">•</span>
          <span className="flex items-center gap-1">
            <FileCode className="w-3 h-3 text-emerald-400" />
            Notepad++ Kod Stüdyosu
          </span>
        </div>

        {/* Right: Copyright */}
        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono text-center md:text-right">
          © {new Date().getFullYear()} screlia labs
        </div>
      </div>
    </footer>
  );
};
