import React from 'react';
import { X, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { MediaConverterView } from './MediaConverterView';
import { soundFx } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onRecordHistory?: (title: string, orig: number, processed: number, format: string) => void;
}

export const FormatConverterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  isDarkMode,
  onRecordHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="format-converter-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="format-converter-modal-window"
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Dosya & Medya Format Dönüştürücü Penceresi
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                  by screlia labs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                MP3 to OPUS / WAV • PNG to JPEG / WEBP • JSON to YAML / CSV
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://screlia.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <span>screlia.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto">
          <MediaConverterView isDarkMode={isDarkMode} onRecordHistory={onRecordHistory} />
        </div>
      </div>
    </div>
  );
};
