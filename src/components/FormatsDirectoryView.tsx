import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Shield,
  Gauge,
  HardDrive,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { ArchiveFormat } from '../types';
import { SUPPORTED_FORMATS } from '../utils/supportedFormats';
import { soundFx } from '../utils/audio';

interface Props {
  isDarkMode: boolean;
  selectedFormat: ArchiveFormat;
  onSelectFormat: (format: ArchiveFormat) => void;
}

export const FormatsDirectoryView: React.FC<Props> = ({
  isDarkMode,
  selectedFormat,
  onSelectFormat,
}) => {
  const categories = [
    'Tümü',
    'Evrensel',
    'Yüksek Sıkıştırma',
    'UNIX & DevOps',
    'Disk & Sanallaştırma',
    'Medya & Çizgi Roman',
    'Paket & Dağıtım',
  ] as const;

  const [activeCategory, setActiveCategory] = useState<string>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFormats = SUPPORTED_FORMATS.filter((f) => {
    const matchesCat = activeCategory === 'Tümü' || f.category === activeCategory;
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.ext.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.algorithm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner - Clean, Professional */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isDarkMode
            ? 'bg-slate-900/80 border-slate-800'
            : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <Zap className="w-3.5 h-3.5" />
              <span>szip 24+ Format Motoru</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Desteklenen Arşiv ve Sıkıştırma Standartları Rehberi
            </h2>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              szip; evrensel ZIP ve 7-Zip&apos;ten Zstandard, XZ, Bzip2, LZ4, CBZ/CBR çizgi romanlarına,
              Apple DMG, ISO, WIM disk imajlarına ve APK, IPA, DEB, RPM paketlerine kadar 24+ endüstriyel
              formatı doğrudan tarayıcınızda yönetir.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-center">
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">24+</div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Desteklenen Format</div>
            </div>
            <div className="px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-center">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">0 - 9</div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Sıkıştırma Kademesi</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                soundFx.playClick();
                setActiveCategory(cat);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : isDarkMode
                  ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick Filter Input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Format veya algoritma ara..."
            className={`w-full px-3 py-1.5 rounded-lg border text-xs outline-none transition-colors ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500'
                : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
            }`}
          />
        </div>
      </div>

      {/* Grid of 24 Formats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
        {filteredFormats.map((format) => {
          const isSelected = selectedFormat === format.id;
          return (
            <div
              key={format.id}
              onClick={() => {
                soundFx.playPop();
                onSelectFormat(format.id);
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col justify-between group ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20'
                  : isDarkMode
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {format.ext}
                    </span>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate max-w-[160px]">
                      {format.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {format.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[44px]">
                  {format.description}
                </p>

                {/* Algorithm & Specs */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-blue-500" />
                      Algoritma:
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-medium truncate max-w-[140px]">
                      {format.algorithm}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-emerald-500" />
                      Hız / Oran:
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {format.compressionSpeed} / {format.ratioScore}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 truncate pt-0.5">
                    <span className="font-semibold">Kullanım:</span> {format.popularUsage}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  {format.category}
                </span>

                <button
                  type="button"
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-600 dark:text-blue-400 group-hover:underline'
                  }`}
                >
                  <span>{isSelected ? 'Seçildi' : 'Bu Formatı Kullan'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
