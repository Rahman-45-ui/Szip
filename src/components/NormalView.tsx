import React, { useRef, useState } from 'react';
import {
  Archive,
  FolderArchive,
  UploadCloud,
  FilePlus,
  FolderOpen,
  Trash2,
  Lock,
  Zap,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  Download,
  Eye,
  Sliders,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Folder,
} from 'lucide-react';
import { ArchiveFormat, CompressionSettings, FileItem, LoadedArchive, QuickLookFile } from '../types';
import { formatBytes, getFileCategory, isMacJunkFile } from '../utils/formatters';
import { soundFx } from '../utils/audio';
import { readArchiveFile, triggerDownload } from '../utils/zipEngine';
import JSZip from 'jszip';

interface Props {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  compressionSettings: CompressionSettings;
  setCompressionSettings: React.Dispatch<React.SetStateAction<CompressionSettings>>;
  onCompress: () => void;
  isProcessing: boolean;
  progressPercent: number;
  progressStatus: string;
  isDarkMode: boolean;
  onPreviewFile: (file: QuickLookFile) => void;
  onSwitchToStudio: () => void;
  onOpenConverter?: () => void;
}

export const NormalView: React.FC<Props> = ({
  files,
  setFiles,
  compressionSettings,
  setCompressionSettings,
  onCompress,
  isProcessing,
  progressPercent,
  progressStatus,
  isDarkMode,
  onPreviewFile,
  onSwitchToStudio,
  onOpenConverter,
}) => {
  const [normalTab, setNormalTab] = useState<'compress' | 'extract'>('compress');
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadedArchive, setLoadedArchive] = useState<LoadedArchive | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const archiveInputRef = useRef<HTMLInputElement>(null);

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const junkFiles = files.filter((f) => f.isMacJunk || isMacJunkFile(f.name));

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    soundFx.playPop();

    if (normalTab === 'compress') {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files) as File[];
        const newItems: FileItem[] = [];

        for (const file of droppedFiles) {
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
      }
    } else {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        loadArchive(file);
      }
    }
  };

  const handleNativeFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      soundFx.playPop();
      const fileList = Array.from(e.target.files) as File[];
      const newItems: FileItem[] = [];

      for (const file of fileList) {
        const buffer = await file.arrayBuffer();
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'file',
          path: file.webkitRelativePath || file.name,
          lastModified: file.lastModified,
          file: file,
          content: new Uint8Array(buffer),
          isMacJunk: isMacJunkFile(file.name),
        });
      }
      setFiles((prev) => [...prev, ...newItems]);
      e.target.value = '';
    }
  };

  const loadArchive = async (file: File) => {
    try {
      soundFx.playClick();
      const archive = await readArchiveFile(file);
      setLoadedArchive(archive);
      soundFx.playSuccessChime();
    } catch (err) {
      alert('Arşiv açılamadı: ' + (err as Error).message);
    }
  };

  const handleExtractAll = async () => {
    if (!loadedArchive) return;
    setIsExtracting(true);
    soundFx.playPop();

    try {
      const zip = new JSZip();
      for (const entry of loadedArchive.entries) {
        if (entry.dir) {
          zip.folder(entry.path);
        } else if (entry.asyncContent) {
          const content = await entry.asyncContent();
          zip.file(entry.path, content);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(blob, `${loadedArchive.fileName.replace(/\.[^/.]+$/, '')}_Acilmis.zip`);
      soundFx.playSuccessChime();
    } catch (err) {
      alert('Ayıklama hatası: ' + (err as Error).message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractSingle = async (entry: any) => {
    if (entry.dir || !entry.asyncContent) return;
    soundFx.playClick();
    try {
      const content = await entry.asyncContent();
      let blob: Blob;
      if (typeof content === 'string') {
        blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      } else if (content instanceof Blob) {
        blob = content;
      } else {
        blob = new Blob([content]);
      }
      triggerDownload(blob, entry.name);
      soundFx.playSuccessChime();
    } catch (err) {
      alert('Dosya indirilemedi: ' + (err as Error).message);
    }
  };

  const handlePreviewItem = (file: FileItem) => {
    soundFx.playPop();
    const isImg = /\.(png|jpg|jpeg|svg|gif|webp|ico|bmp)$/i.test(file.name);
    const isTxt = /\.(txt|md|json|ts|tsx|js|jsx|html|css|py|rs|go|sh|env|xml|yaml|sql)$/i.test(file.name);

    let blobUrl: string | undefined;
    let textContent: string | undefined;

    if (file.file && isImg) {
      blobUrl = URL.createObjectURL(file.file);
    } else if (file.content instanceof Uint8Array && isImg) {
      blobUrl = URL.createObjectURL(new Blob([file.content]));
    }

    if (typeof file.content === 'string') {
      textContent = file.content;
    } else if (file.content instanceof Uint8Array && isTxt) {
      try {
        textContent = new TextDecoder().decode(file.content);
      } catch {
        textContent = '';
      }
    }

    onPreviewFile({
      name: file.name,
      size: file.size,
      type: file.type,
      date: new Date(file.lastModified),
      textContent,
      blobUrl,
      isImage: isImg,
      isCode: isTxt,
    });
  };

  const presets = [
    {
      id: 'zip-std',
      name: 'Standart ZIP',
      desc: 'Her cihaz ve işletim sisteminde anında açılır',
      icon: Zap,
      format: 'zip' as ArchiveFormat,
      level: 6,
      badge: 'En Popüler',
    },
    {
      id: '7z-ultra',
      name: 'Ultra 7Z',
      desc: 'Maksimum sıkıştırma oranı, en küçük dosya boyutu',
      icon: HardDrive,
      format: '7z' as ArchiveFormat,
      level: 9,
      badge: 'Yüksek Oran',
    },
    {
      id: 'tar-gz',
      name: 'Tarball (.tar.gz)',
      desc: 'Linux ve geliştirici projeleri için standart',
      icon: Archive,
      format: 'tgz' as ArchiveFormat,
      level: 6,
      badge: 'Dev Uyumlu',
    },
    {
      id: 'zip-secure',
      name: 'Şifreli ZIP',
      desc: 'AES parola koruması ile güvenli arşiv',
      icon: Lock,
      format: 'zip' as ArchiveFormat,
      level: 6,
      badge: 'Güvenli',
      isSecure: true,
    },
  ];

  return (
    <div id="normal-view-container" className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col items-center">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleNativeFileInput}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleNativeFileInput}
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
      />
      <input
        ref={archiveInputRef}
        type="file"
        accept=".zip,.7z,.tar,.tgz,.gz,.bz2,.xz,.zst,.rar,.iso,.dmg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            loadArchive(e.target.files[0]);
          }
        }}
      />

      <div className="w-full max-w-4xl space-y-6">
        {/* Mode & Action Segmented Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                szip Klasik Arşivleyici
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider">
                Normal Mod
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hızlı, sade ve tek tıkla arşivleme veya ayıklama •{' '}
              <a
                href="https://screlia.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-700 dark:text-slate-300 hover:text-blue-500 underline decoration-blue-500/30 transition-colors"
              >
                by screlia labs
              </a>
            </p>
          </div>

          {/* Compress vs Extract vs Format Converter Tab Switcher */}
          <div className="flex items-center gap-2">
            <div
              className={`p-1 rounded-xl border flex items-center gap-1 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                id="btn-normal-tab-compress"
                onClick={() => {
                  soundFx.playClick();
                  setNormalTab('compress');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  normalTab === 'compress'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>Sıkıştır</span>
              </button>

              <button
                id="btn-normal-tab-extract"
                onClick={() => {
                  soundFx.playClick();
                  setNormalTab('extract');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  normalTab === 'extract'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FolderArchive className="w-4 h-4" />
                <span>Arşiv Aç</span>
              </button>
            </div>

            {onOpenConverter && (
              <button
                id="btn-normal-open-converter"
                onClick={() => {
                  soundFx.playPop();
                  onOpenConverter();
                }}
                title="Ses, Görsel & Belge Format Dönüştürücü (MP3 to OPUS, PNG to JPEG)"
                className="px-3.5 py-2 rounded-xl bg-purple-600/10 hover:bg-purple-600 text-purple-600 hover:text-white border border-purple-500/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Format Dönüştür</span>
              </button>
            )}
          </div>
        </div>

        {/* COMPRESS TAB CONTENT */}
        {normalTab === 'compress' && (
          <div className="space-y-6">
            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                isDragOver
                  ? isDarkMode
                    ? 'bg-blue-950/40 border-blue-500 ring-4 ring-blue-500/20'
                    : 'bg-blue-50 border-blue-500 ring-4 ring-blue-500/20'
                  : isDarkMode
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-300 hover:border-slate-400 shadow-2xs'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mx-auto mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Sıkıştırmak İstediğiniz Dosya veya Klasörleri Buraya Bırakın
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Tüm dosya formatları desteklenir. Arşiviniz doğrudan tarayıcınızda, gizli ve ultra hızlı oluşturulur.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                <button
                  id="btn-normal-add-files"
                  onClick={() => {
                    soundFx.playClick();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
                >
                  <FilePlus className="w-4 h-4" />
                  Dosyaları Seç
                </button>

                <button
                  id="btn-normal-add-folder"
                  onClick={() => {
                    soundFx.playClick();
                    folderInputRef.current?.click();
                  }}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                      : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  Klasör Ekle
                </button>
              </div>
            </div>

            {/* Added Files List (if any) */}
            {files.length > 0 && (
              <div
                className={`rounded-2xl border p-4 space-y-3 ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      Arşive Eklenecek Dosyalar ({files.length})
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      • {formatBytes(totalBytes)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {junkFiles.length > 0 && (
                      <button
                        onClick={() => {
                          soundFx.playTrash();
                          setFiles((prev) => prev.filter((f) => !f.isMacJunk && !isMacJunkFile(f.name)));
                        }}
                        className="text-[11px] font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>🧹 {junkFiles.length} Çöpü Temizle</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        soundFx.playTrash();
                        setFiles([]);
                      }}
                      className="text-[11px] text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Tümünü Kaldır
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 border rounded-xl border-slate-100 dark:border-slate-800">
                  {files.map((file) => {
                    const cat = getFileCategory(file.name);
                    return (
                      <div
                        key={file.id}
                        className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-4">
                          <span
                            className={`w-6 h-6 rounded-md font-mono text-[9px] font-bold uppercase flex items-center justify-center border shrink-0 ${cat.color}`}
                          >
                            {cat.ext.substring(0, 3)}
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {file.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatBytes(file.size)}
                          </span>
                          <button
                            onClick={() => handlePreviewItem(file)}
                            title="Önizle"
                            className="p-1 text-slate-400 hover:text-blue-500 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              soundFx.playTrash();
                              setFiles((prev) => prev.filter((f) => f.id !== file.id));
                            }}
                            title="Kaldır"
                            className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Archive Presets */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Arşiv Türü Seçin
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {presets.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected =
                    compressionSettings.format === preset.format &&
                    (preset.isSecure ? compressionSettings.enableEncryption : true);

                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        soundFx.playPop();
                        setCompressionSettings((prev) => ({
                          ...prev,
                          format: preset.format,
                          level: preset.level as any,
                          enableEncryption: !!preset.isSecure,
                        }));
                      }}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-150 relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                          : isDarkMode
                          ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {preset.badge}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {preset.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {preset.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Archive Settings Summary (Name & Password if enabled) */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Arşiv Dosya Adı
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={compressionSettings.archiveName}
                      onChange={(e) =>
                        setCompressionSettings((prev) => ({
                          ...prev,
                          archiveName: e.target.value,
                        }))
                      }
                      placeholder="szip_arsiv"
                      className={`w-full p-2 rounded-l-xl border text-xs font-mono outline-hidden ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                    <span className="px-3 py-2 rounded-r-xl border border-l-0 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-800">
                      .{compressionSettings.format}
                    </span>
                  </div>
                </div>

                {compressionSettings.enableEncryption ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-500" />
                      Arşiv Parolası
                    </label>
                    <input
                      type="password"
                      value={compressionSettings.password || ''}
                      onChange={(e) =>
                        setCompressionSettings((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Güçlü bir parola girin..."
                      className={`w-full p-2 rounded-xl border text-xs outline-hidden ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={compressionSettings.excludeMacJunk}
                        onChange={(e) =>
                          setCompressionSettings((prev) => ({
                            ...prev,
                            excludeMacJunk: e.target.checked,
                          }))
                        }
                        className="rounded text-blue-600"
                      />
                      <span>Gereksiz sistem dosyalarını (.DS_Store vb.) ayıkla</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Big Action Compress Button */}
            <div className="pt-2">
              <button
                id="btn-normal-compress-action"
                onClick={onCompress}
                disabled={files.length === 0 || isProcessing}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-99 cursor-pointer ${
                  files.length === 0 || isProcessing
                    ? 'bg-slate-600/50 cursor-not-allowed opacity-60'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{progressStatus || 'Arşiv Oluşturuluyor...'} ({progressPercent}%)</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>
                      {files.length > 0
                        ? `${files.length} Dosyayı Sıkıştır ve İndir (.${compressionSettings.format})`
                        : 'Arşivlemek İçin Dosya Ekleyin'}
                    </span>
                  </>
                )}
              </button>

              {/* Progress bar */}
              {isProcessing && (
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXTRACT TAB CONTENT */}
        {normalTab === 'extract' && (
          <div className="space-y-6">
            {!loadedArchive ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                  isDragOver
                    ? isDarkMode
                      ? 'bg-amber-950/40 border-amber-500'
                      : 'bg-amber-50 border-amber-500'
                    : isDarkMode
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-300 hover:border-slate-400 shadow-2xs'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto mb-3">
                  <FolderArchive className="w-7 h-7" />
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Açmak İstediğiniz Arşivi Buraya Bırakın
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  ZIP, 7Z, RAR, TAR, GZ, ISO, DMG ve 24+ arşiv formatı desteklenir.
                </p>

                <div className="mt-5">
                  <button
                    id="btn-normal-select-archive"
                    onClick={() => {
                      soundFx.playClick();
                      archiveInputRef.current?.click();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all mx-auto cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Arşiv Dosyası Seç
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-2xl border p-5 space-y-4 ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                {/* Archive header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                      <FolderArchive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {loadedArchive.fileName}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {loadedArchive.filesCount} dosya • {formatBytes(loadedArchive.fileSize)} (Açılmış: {formatBytes(loadedArchive.totalUncompressedSize)})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => archiveInputRef.current?.click()}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                        isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Başka Dosya Aç
                    </button>
                    <button
                      id="btn-normal-extract-all"
                      onClick={handleExtractAll}
                      disabled={isExtracting}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExtracting ? 'Ayıklanıyor...' : 'Tümünü Ayıkla (.zip)'}</span>
                    </button>
                  </div>
                </div>

                {/* Entry List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 border rounded-xl border-slate-100 dark:border-slate-800">
                  {loadedArchive.entries.map((entry) => {
                    const cat = getFileCategory(entry.name);
                    return (
                      <div
                        key={entry.id}
                        className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-4">
                          {entry.dir ? (
                            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : (
                            <span
                              className={`w-5 h-5 rounded font-mono text-[8px] font-bold uppercase flex items-center justify-center border shrink-0 ${cat.color}`}
                            >
                              {cat.ext.substring(0, 3)}
                            </span>
                          )}
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {entry.path}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatBytes(entry.uncompressedSize)}
                          </span>
                          {!entry.dir && (
                            <button
                              onClick={() => handleExtractSingle(entry)}
                              title="İndir"
                              className="p-1 text-slate-400 hover:text-blue-500 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Promo / Banner to switch to Studio Mode */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDarkMode
              ? 'bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-slate-900/60 border-blue-900/40'
              : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-100'
          }`}
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Gelişmiş Geliştirici & Stüdyo Araçları
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Notepad++ Kod Editörü, Git Entegrasyonu, Metadata & EXIF Temizliği ve 24+ Format Rehberi Studio Modunda!
              </p>
            </div>
          </div>

          <button
            id="btn-switch-to-studio-promo"
            onClick={() => {
              soundFx.playSuccessChime();
              onSwitchToStudio();
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-98 shrink-0 cursor-pointer"
          >
            <span>Studio Moduna Geç</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
