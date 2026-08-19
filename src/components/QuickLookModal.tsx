import React, { useEffect } from 'react';
import {
  X,
  FileCode,
  FileText,
  Image as ImageIcon,
  Copy,
  Check,
  Download,
  Calendar,
  HardDrive,
  File,
  Edit3,
} from 'lucide-react';
import { QuickLookFile } from '../types';
import { formatBytes } from '../utils/formatters';
import { soundFx } from '../utils/audio';

interface Props {
  file: QuickLookFile | null;
  onClose: () => void;
  isDarkMode: boolean;
  onOpenInNpp?: (file: QuickLookFile) => void;
}

export const QuickLookModal: React.FC<Props> = ({ file, onClose, isDarkMode, onOpenInNpp }) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        if (e.code === 'Space') {
          e.preventDefault();
        }
        soundFx.playPreview();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!file) return null;

  const handleCopy = () => {
    if (file.textContent) {
      navigator.clipboard.writeText(file.textContent);
      setCopied(true);
      soundFx.playPop();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadSingle = () => {
    soundFx.playSuccessChime();
    if (file.blobUrl) {
      const a = document.createElement('a');
      a.href = file.blobUrl;
      a.download = file.name;
      a.click();
    } else if (file.textContent) {
      const blob = new Blob([file.textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        id="quicklook-window"
        className={`relative w-full max-w-2xl max-h-[82vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
          isDarkMode ? 'bg-slate-900/95 border-slate-700 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-800'
        }`}
      >
        {/* macOS Quick Look Header */}
        <div
          className={`h-11 px-4 flex items-center justify-between border-b select-none ${
            isDarkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-100/90 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wide flex items-center gap-1.5 truncate max-w-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {file.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
              Quick Look
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {file.textContent && onOpenInNpp && (
              <button
                onClick={() => {
                  onClose();
                  onOpenInNpp(file);
                }}
                title="NPP Editör ile Aç & Düzenle"
                className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center gap-1 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>NPP ile Düzenle</span>
              </button>
            )}

            {file.textContent && (
              <button
                onClick={handleCopy}
                title="İçeriği Kopyala"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={handleDownloadSingle}
              title="Dosyayı Dışa Aktar"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              id="btn-close-quicklook"
              onClick={() => {
                soundFx.playPreview();
                onClose();
              }}
              title="Kapat (Space / Esc)"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center min-h-[300px] max-h-[550px]">
          {file.isImage && file.blobUrl ? (
            <div className="flex flex-col items-center justify-center gap-2 p-2">
              <img
                src={file.blobUrl}
                alt={file.name}
                className="max-h-[400px] max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
          ) : file.textContent ? (
            <div className="w-full h-full text-left font-mono text-xs overflow-auto p-3 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 leading-relaxed whitespace-pre-wrap">
              {file.textContent}
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <File className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">{file.name}</h4>
                <p className="text-xs text-slate-400 mt-1">İkili (Binary) Dosya İçeriği</p>
              </div>
              <button
                onClick={handleDownloadSingle}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium inline-flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Dosyayı İndir
              </button>
            </div>
          )}
        </div>

        {/* Info Footer Bar */}
        <div
          className={`px-4 py-2 border-t text-[11px] flex items-center justify-between select-none ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-blue-500" />
              {formatBytes(file.size)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {file.date ? new Date(file.date).toLocaleDateString('tr-TR') : 'Bugün'}
            </span>
          </div>

          <div className="text-[10px] text-slate-400">
            Kapatmak için <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">Boşluk</kbd> veya <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">ESC</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
