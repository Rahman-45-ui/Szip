import React, { useRef, useState } from 'react';
import {
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Download,
  ShieldCheck,
  Zap,
  HardDrive,
  FileX,
  MapPin,
  Camera,
  User,
  Clock,
  FileCheck,
  Eye,
  Sliders,
  RefreshCw,
  UploadCloud,
  FilePlus,
} from 'lucide-react';
import { FileItem, FileMetadataReport } from '../types';
import { isMacJunkFile, formatBytes } from '../utils/formatters';
import { analyzeFileMetadata, sanitizeFileItem } from '../utils/metadataCleaner';
import { createArchiveZip, triggerDownload } from '../utils/zipEngine';
import { soundFx } from '../utils/audio';

interface Props {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  isDarkMode: boolean;
  onRecordHistory: (title: string, orig: number, processed: number, format: string) => void;
}

export const CleanerTab: React.FC<Props> = ({
  files,
  setFiles,
  isDarkMode,
  onRecordHistory,
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files[0]?.id || null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanedSuccess, setCleanedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings switches
  const [stripExifGps, setStripExifGps] = useState(true);
  const [stripDocAuthors, setStripDocAuthors] = useState(true);
  const [stripOsJunk, setStripOsJunk] = useState(true);
  const [normalizeTimestamps, setNormalizeTimestamps] = useState(true);

  // Analyze files metadata
  const reports: FileMetadataReport[] = files.map((f) => analyzeFileMetadata(f));

  const totalGpsLeaks = reports.filter((r) => r.hasGps).length;
  const totalExifLeaks = reports.filter((r) => r.hasExif).length;
  const totalOsJunk = reports.filter((r) => r.hasOsJunk).length;
  const totalTags = reports.reduce((acc, r) => acc + r.tagsFound.length, 0);

  const activeReport = reports.find((r) => r.fileId === selectedFileId) || reports[0];

  const handleCleanAll = async () => {
    if (files.length === 0) return;
    setIsCleaning(true);
    soundFx.playClick();

    const origSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

    // 1. Filter junk if enabled
    let effectiveFiles = files;
    if (stripOsJunk) {
      effectiveFiles = files.filter(
        (f) => !f.isMacJunk && !isMacJunkFile(f.name) && !isMacJunkFile(f.path)
      );
    }

    // 2. Sanitize items with real byte-level PNG & JPEG metadata removal
    const sanitizedFiles: FileItem[] = [];
    for (const f of effectiveFiles) {
      const clean = await sanitizeFileItem(f);
      sanitizedFiles.push(clean);
    }

    setFiles(sanitizedFiles);

    // 3. Create sanitized clean ZIP
    const result = await createArchiveZip(sanitizedFiles, {
      archiveName: 'Hijyenik_Temiz_Arsiv',
      format: 'zip',
      level: 6,
      excludeMacJunk: true,
      enableEncryption: false,
      splitVolume: false,
      volumeSizeMB: 10,
      comment: 'szip Gerçek Metadata & Privacy Sanitizer ile arındırıldı',
      solidArchive: false,
    });

    triggerDownload(result.blob, 'Hijyenik_Temiz_Arsiv.zip');
    onRecordHistory('Gerçek Metadata ve EXIF Temizliği', origSize, result.compressedSize, 'zip');

    soundFx.playSuccessChime();
    setCleanedSuccess(true);
    setIsCleaning(false);
  };

  const handleNativeFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      soundFx.playPop();
      const newItems: FileItem[] = [];
      const fileList = Array.from(e.target.files) as File[];
      for (const file of fileList) {
        const buffer = await file.arrayBuffer();
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'file',
          path: file.name,
          lastModified: file.lastModified,
          file: file,
          content: new Uint8Array(buffer),
          isMacJunk: isMacJunkFile(file.name),
        });
      }
      setFiles((prev) => [...prev, ...newItems]);
      if (newItems.length > 0) {
        setSelectedFileId(newItems[0].id);
      }
      e.target.value = '';
    }
  };

  return (
    <div id="metadata-cleaner-root" className="h-full flex flex-col overflow-y-auto p-4 sm:p-6 space-y-6 select-none">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleNativeFileInput}
      />

      {/* Header Banner */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Gerçek Metadata, EXIF & Gizlilik Temizleyici
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PNG, JPEG, SVG ve belgelerinizdeki gerçek bayt düzeyinde EXIF, GPS konumları, kamera modelleri,
                ve işletim sistemi izlerini kalıcı olarak arındırır.
              </p>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-98"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Dosya Seç & İncele</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span>GPS Konum İzi</span>
          </div>
          <div className="text-2xl font-bold text-red-500 mt-1">
            {totalGpsLeaks} Dosya
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Gerçek koordinat kaydı
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <Camera className="w-3.5 h-3.5 text-amber-500" />
            <span>Kamera / EXIF</span>
          </div>
          <div className="text-2xl font-bold text-amber-500 mt-1">
            {totalExifLeaks} Dosya
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Cihaz modeli, lens, parametreler
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <HardDrive className="w-3.5 h-3.5 text-blue-500" />
            <span>Sistem Çöpleri</span>
          </div>
          <div className="text-2xl font-bold text-blue-500 mt-1">
            {totalOsJunk} Adet
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            .DS_Store, Thumbs.db
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tespit Edilen Etiket</span>
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-1">
            {totalTags} Etiket
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Arındırılacak parametre
          </div>
        </div>
      </div>

      {/* Main Inspection Grid */}
      {files.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Metadata ve EXIF Temizliği İçin Dosya Ekleyin
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            PNG, JPEG veya belgelerinizi yükleyin; içlerindeki tüm gömülü GPS koordinatları, kamera/cihaz bilgileri
            ve işletim sistemi izleri otomatik olarak taranır ve arındırılır.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all"
          >
            <FilePlus className="w-4 h-4" />
            <span>Dosyaları Seç</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: File List */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
                Dosya Listesi & İnceleme
              </h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-semibold text-blue-500 hover:underline"
              >
                + Dosya Ekle
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
              {files.map((f) => {
                const rep = reports.find((r) => r.fileId === f.id);
                const isSelected = selectedFileId === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      soundFx.playClick();
                      setSelectedFileId(f.id);
                    }}
                    className={`p-2.5 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-blue-900/30'
                          : 'bg-blue-50'
                        : isDarkMode
                        ? 'hover:bg-slate-800/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {f.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {formatBytes(f.size)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {rep?.hasGps && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                          GPS
                        </span>
                      )}
                      {rep?.hasExif && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          EXIF
                        </span>
                      )}
                      {rep?.hasOsJunk && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          Çöp
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center/Right Column: Metadata Inspector & Comparison */}
          <div
            className={`lg:col-span-2 p-5 rounded-xl border space-y-4 ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            {activeReport ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {activeReport.fileName}
                    </h4>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {activeReport.filePath} • {formatBytes(activeReport.fileSize)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-1 rounded-lg font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {activeReport.tagsFound.length} Tespit Edilen Parametre
                    </span>
                  </div>
                </div>

                {/* Tags Table */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ayrıntılı Bayt Düzeyinde Metadata Analizi
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
                    {activeReport.tagsFound.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        Bu dosyada herhangi bir gizlilik riski veya gömülü EXIF/GPS etiketi bulunmuyor.
                      </div>
                    ) : (
                      activeReport.tagsFound.map((tag, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                              <span>{tag.tag}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  tag.risk === 'high'
                                    ? 'bg-red-500/10 text-red-500'
                                    : tag.risk === 'medium'
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-blue-500/10 text-blue-500'
                                }`}
                              >
                                {tag.risk === 'high' ? 'Yüksek Risk' : tag.risk === 'medium' ? 'Orta Risk' : 'Düşük'}
                              </span>
                            </div>
                            <div className="text-slate-500 text-[11px] font-mono">
                              {tag.value}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              ✓ Arındırılacak
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Cleaning Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripExifGps}
                      onChange={(e) => setStripExifGps(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      PNG & JPEG EXIF / GPS Verilerini Sil
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripDocAuthors}
                      onChange={(e) => setStripDocAuthors(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Belge & PDF Yazar İmzalarını Temizle
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripOsJunk}
                      onChange={(e) => setStripOsJunk(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      .DS_Store & Thumbs.db Çöplerini Sil
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={normalizeTimestamps}
                      onChange={(e) => setNormalizeTimestamps(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Zaman Damgalarını Sabitle (1980-01-01)
                    </span>
                  </label>
                </div>

                {/* Action Button */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={handleCleanAll}
                    disabled={isCleaning || files.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-2xs transition-all active:scale-98"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isCleaning ? 'Temizleniyor...' : 'Tümünü Temizle ve Hijyenik Arşiv İndir'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                İncelemek için sol listeden bir dosya seçin.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
