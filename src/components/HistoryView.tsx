import React from 'react';
import {
  History,
  HardDrive,
  TrendingDown,
  FileArchive,
  Trash2,
  CheckCircle2,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { HistoryItem } from '../types';
import { formatBytes, formatTimeAgo } from '../utils/formatters';
import { soundFx } from '../utils/audio';

interface Props {
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  isDarkMode: boolean;
}

export const HistoryView: React.FC<Props> = ({ history, setHistory, isDarkMode }) => {
  const totalSavedBytes = history.reduce((acc, h) => acc + Math.max(0, h.originalSize - h.processedSize), 0);
  const avgRatio = history.length > 0 
    ? Math.round(history.reduce((acc, h) => acc + h.savingsRatio, 0) / history.length) 
    : 0;

  const handleClearHistory = () => {
    soundFx.playTrash();
    setHistory([]);
  };

  return (
    <div id="history-view" className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <HardDrive className="w-4 h-4 text-emerald-500" />
            <span>Kazanılan Toplam Alan</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {formatBytes(totalSavedBytes)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Diskte tasarruf edilen veri hacmi</p>
        </div>

        <div
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <TrendingDown className="w-4 h-4 text-blue-500" />
            <span>Ortalama Sıkıştırma Oranı</span>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            %{avgRatio}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Deflate algoritması optimizasyon verimi</p>
        </div>

        <div
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <FileArchive className="w-4 h-4 text-purple-500" />
            <span>Tamamlanan İşlemler</span>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {history.length} Adet
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sıkıştırma & Çıkarma & Temizlik</p>
        </div>
      </div>

      {/* History Log Table */}
      <div
        className={`rounded-xl border overflow-hidden ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div
          className={`px-4 py-3 border-b flex items-center justify-between ${
            isDarkMode ? 'bg-slate-800/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <History className="w-4 h-4 text-blue-500" />
            <span>Geçmiş İşlem Kayıtları</span>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Geçmişi Temizle</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <History className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
              Henüz bir işlem kaydı bulunmuyor
            </h4>
            <p className="text-[11px] text-slate-400">
              Yeni bir dosya grubu sıkıştırdığınızda veya arşiv açtığınızda kayıtlar burada listelenecektir.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {history.map((item) => (
              <div
                key={item.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      item.type === 'clean'
                        ? 'bg-amber-500/10 text-amber-500'
                        : item.type === 'extract'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {item.type === 'clean' ? (
                      <Sparkles className="w-4 h-4" />
                    ) : item.type === 'extract' ? (
                      <FileArchive className="w-4 h-4" />
                    ) : (
                      <HardDrive className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{formatTimeAgo(item.timestamp)}</span>
                      <span>•</span>
                      <span className="uppercase font-mono font-semibold text-blue-500">
                        {item.format}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {formatBytes(item.originalSize)} → {formatBytes(item.processedSize)}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    %{item.savingsRatio} Tasarruf
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
