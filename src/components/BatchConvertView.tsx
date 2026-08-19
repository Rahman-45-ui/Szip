import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  Download,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Sparkles,
  FileArchive,
} from 'lucide-react';
import { ArchiveFormat, FileItem } from '../types';
import { formatBytes } from '../utils/formatters';
import { createArchiveZip, triggerDownload } from '../utils/zipEngine';
import { soundFx } from '../utils/audio';
import { SUPPORTED_FORMATS, getFormatMeta } from '../utils/supportedFormats';

interface Props {
  files: FileItem[];
  isDarkMode: boolean;
  onRecordHistory: (title: string, orig: number, processed: number, format: string) => void;
}

export const BatchConvertView: React.FC<Props> = ({ files, isDarkMode, onRecordHistory }) => {
  const [targetFormat, setTargetFormat] = useState<ArchiveFormat>('7z');
  const [batchMode, setBatchMode] = useState<'single' | 'individual'>('individual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const currentMeta = getFormatMeta(targetFormat);

  const handleStartBatch = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgress(10);
    soundFx.playClick();

    if (batchMode === 'individual') {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const res = await createArchiveZip([f], {
          archiveName: f.name.replace(/\.[^/.]+$/, ''),
          format: targetFormat,
          level: currentMeta.defaultLevel,
          excludeMacJunk: true,
          enableEncryption: false,
          splitVolume: false,
          volumeSizeMB: 10,
          comment: `szip Toplu Dönüştürücü - ${currentMeta.name}`,
          solidArchive: false,
        });

        triggerDownload(res.blob, `${f.name.replace(/\.[^/.]+$/, '')}${currentMeta.ext}`);
        setProgress(Math.round(((i + 1) / files.length) * 100));
        onRecordHistory(`Toplu Paketleme (${f.name})`, f.size, res.compressedSize, targetFormat);
      }
    } else {
      const res = await createArchiveZip(files, {
        archiveName: 'szip_Toplu_Birlestirilmis_Arsiv',
        format: targetFormat,
        level: currentMeta.defaultLevel,
        excludeMacJunk: true,
        enableEncryption: false,
        splitVolume: false,
        volumeSizeMB: 10,
        comment: `szip Toplu Birleşik Arşiv - ${currentMeta.name}`,
        solidArchive: false,
      });

      triggerDownload(res.blob, `szip_Toplu_Birlestirilmis_Arsiv${currentMeta.ext}`);
      setProgress(100);
      const totalOrig = files.reduce((acc, f) => acc + (f.size || 0), 0);
      onRecordHistory('Toplu Birleşik Paket', totalOrig, res.compressedSize, targetFormat);
    }

    setIsProcessing(false);
    soundFx.playClick();
  };

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 sm:p-6 space-y-6 select-none">
      {/* Header Banner */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isDarkMode
            ? 'bg-slate-900/80 border-slate-800'
            : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Toplu Arşiv ve Format Dönüştürücü
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Yüklenen tüm dosyaları tek tek bağımsız arşivlere dönüştürün veya hepsini tek bir
              yüksek sıkıştırmalı hedef pakette birleştirin.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Batch Strategy */}
        <div
          className={`p-5 rounded-xl border space-y-4 ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </div>
            <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
              Dönüştürme Modu
            </h3>
          </div>

          <div className="space-y-2">
            <label
              onClick={() => setBatchMode('individual')}
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                batchMode === 'individual'
                  ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500'
                  : isDarkMode
                  ? 'border-slate-800 bg-slate-950/40 hover:bg-slate-800'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="batchMode"
                checked={batchMode === 'individual'}
                onChange={() => setBatchMode('individual')}
                className="mt-0.5 text-blue-600"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Her Dosyayı Ayrı Arşiv Yap (Tekil)
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Her girdi dosyası için seçilen formatta ayrı bir arşiv oluşturup indirir.
                </div>
              </div>
            </label>

            <label
              onClick={() => setBatchMode('single')}
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                batchMode === 'single'
                  ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500'
                  : isDarkMode
                  ? 'border-slate-800 bg-slate-950/40 hover:bg-slate-800'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="batchMode"
                checked={batchMode === 'single'}
                onChange={() => setBatchMode('single')}
                className="mt-0.5 text-blue-600"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Tüm Dosyaları Tek Pakette Birleştir
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Tüm öğeleri tek bir arşiv içinde konsolide eder.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Step 2: Target Format Picker */}
        <div
          className={`p-5 rounded-xl border space-y-4 ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              2
            </div>
            <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
              Hedef Çıktı Formatı
            </h3>
          </div>

          <select
            value={targetFormat}
            onChange={(e) => setTargetFormat(e.target.value as ArchiveFormat)}
            className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none font-medium transition-colors ${
              isDarkMode
                ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
            }`}
          >
            {SUPPORTED_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.ext}) - {f.category}
              </option>
            ))}
          </select>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Algoritma:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                {currentMeta.algorithm}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Hız / Sıkıştırma:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                {currentMeta.compressionSpeed} / {currentMeta.ratioScore}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Items Status & Action Button */}
      <div
        className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        <div>
          <div className="text-xs font-semibold text-slate-900 dark:text-white">
            İşlenecek Dosya Durumu
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {files.length > 0
              ? `${files.length} dosya seçildi (${formatBytes(totalBytes)})`
              : 'Henüz dosya eklenmedi. "Sıkıştır" sekmesinden dosya ekleyin.'}
          </div>
        </div>

        <button
          onClick={handleStartBatch}
          disabled={files.length === 0 || isProcessing}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            files.length === 0 || isProcessing
              ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xs'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>
            {isProcessing ? `İşleniyor (%${progress})...` : 'Toplu Dönüştürmeyi Başlat'}
          </span>
        </button>
      </div>
    </div>
  );
};
