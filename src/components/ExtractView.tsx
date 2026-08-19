import React, { useRef, useState, useEffect } from 'react';
import {
  FolderArchive,
  Download,
  FolderOpen,
  Eye,
  FileCode2,
  Edit3,
  Search,
  CheckCircle2,
  AlertTriangle,
  Folder,
  File,
  Layers,
  ChevronRight,
  Shield,
  Copy,
} from 'lucide-react';
import { ArchiveEntry, ContextMenuState, DisplayLayout, LoadedArchive, QuickLookFile } from '../types';
import { formatBytes, getFileCategory } from '../utils/formatters';
import { readArchiveFile, triggerDownload } from '../utils/zipEngine';
import { soundFx } from '../utils/audio';
import { getFormatMeta } from '../utils/supportedFormats';
import JSZip from 'jszip';
import { ContextMenu } from './ContextMenu';

interface Props {
  layout: DisplayLayout;
  searchQuery: string;
  isDarkMode: boolean;
  onPreviewFile: (file: QuickLookFile) => void;
  onOpenInNpp?: (entry: ArchiveEntry, content: string) => void;
}

export const ExtractView: React.FC<Props> = ({
  searchQuery,
  isDarkMode,
  onPreviewFile,
  onOpenInNpp,
}) => {
  const [loadedArchive, setLoadedArchive] = useState<LoadedArchive | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeFolderFilter, setActiveFolderFilter] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    actions: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleZipFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    soundFx.playPop();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await loadArchiveFromNativeFile(file);
    }
  };

  const handleNativeArchiveInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      soundFx.playPop();
      const file = e.target.files[0];
      await loadArchiveFromNativeFile(file);
      e.target.value = '';
    }
  };

  const loadArchiveFromNativeFile = async (file: File) => {
    try {
      const archive = await readArchiveFile(file);
      setLoadedArchive(archive);
      soundFx.playSuccessChime();
    } catch (err) {
      alert('Arşiv okunamadı: ' + (err as Error).message);
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

  const handleExtractSingle = async (entry: ArchiveEntry) => {
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

  const handleOpenEntryInNpp = async (entry: ArchiveEntry) => {
    if (entry.dir || !entry.asyncContent || !onOpenInNpp) return;
    soundFx.playClick();
    try {
      const content = await entry.asyncContent();
      const text = typeof content === 'string' ? content : await (content as Blob).text();
      onOpenInNpp(entry, text);
    } catch {
      alert('Dosya metin olarak açılamadı.');
    }
  };

  const handlePreviewEntry = async (entry: ArchiveEntry) => {
    if (entry.dir || !entry.asyncContent) return;
    soundFx.playPop();

    try {
      const content = await entry.asyncContent();
      const isImg = /\.(png|jpg|jpeg|svg|gif|webp)$/i.test(entry.name);
      const isTxt = /\.(txt|md|json|ts|tsx|js|jsx|html|css|py|rs|go|sh|env|xml|yaml|sql)$/i.test(entry.name);

      let textContent: string | undefined;
      let blobUrl: string | undefined;

      if (typeof content === 'string') {
        textContent = content;
      } else if (content instanceof Blob) {
        if (isImg) {
          blobUrl = URL.createObjectURL(content);
        } else if (isTxt) {
          textContent = await content.text();
        }
      }

      onPreviewFile({
        name: entry.name,
        size: entry.uncompressedSize,
        type: entry.type,
        date: entry.date,
        textContent,
        blobUrl,
        isImage: isImg,
        isCode: isTxt,
      });
    } catch {
      alert('Önizleme yüklenemedi.');
    }
  };

  // Double click dispatcher
  const handleEntryDoubleClick = (entry: ArchiveEntry) => {
    if (entry.dir) return;
    const cat = getFileCategory(entry.name);
    const isCodeOrText =
      cat.category === 'code' ||
      cat.category === 'doc' ||
      entry.name.endsWith('.txt') ||
      entry.name.endsWith('.json') ||
      entry.name.endsWith('.md');

    if (isCodeOrText && onOpenInNpp) {
      handleOpenEntryInNpp(entry);
    } else {
      handlePreviewEntry(entry);
    }
  };

  // Right Click Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent, entry: ArchiveEntry) => {
    e.preventDefault();
    e.stopPropagation();
    if (entry.dir) return;
    soundFx.playClick();
    setSelectedEntryId(entry.id);

    const cat = getFileCategory(entry.name);
    const isCodeOrText =
      cat.category === 'code' ||
      cat.category === 'doc' ||
      entry.name.endsWith('.txt') ||
      entry.name.endsWith('.json') ||
      entry.name.endsWith('.md');

    const actions = [
      ...(isCodeOrText && onOpenInNpp
        ? [
            {
              id: 'npp-edit',
              label: 'Notepad++ ile Düzenle',
              icon: 'edit',
              shortcut: '↵ Enter',
              action: () => handleOpenEntryInNpp(entry),
            },
          ]
        : []),
      {
        id: 'quicklook',
        label: 'Hızlı Bakış (QuickLook)',
        icon: 'eye',
        shortcut: 'Space',
        action: () => handlePreviewEntry(entry),
      },
      {
        id: 'extract-single',
        label: 'Tekil Olarak Ayıkla & İndir',
        icon: 'download',
        action: () => handleExtractSingle(entry),
      },
      {
        id: 'copy-path',
        label: 'Arşiv İçi Yolunu Kopyala',
        icon: 'copy',
        action: () => {
          navigator.clipboard.writeText(entry.path);
          soundFx.playSuccessChime();
        },
      },
    ];

    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      title: entry.name,
      subtitle: `${formatBytes(entry.uncompressedSize)} • ${entry.path}`,
      actions,
    });
  };

  // Filter entries by search and folder
  const filteredEntries = loadedArchive
    ? loadedArchive.entries.filter((entry) => {
        const matchesSearch =
          entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.path.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (activeFolderFilter) {
          return entry.path.startsWith(activeFolderFilter + '/');
        }
        return true;
      })
    : [];

  const formatMeta = loadedArchive?.detectedFormat ? getFormatMeta(loadedArchive.detectedFormat) : null;

  return (
    <div id="extract-view" className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.7z,.tar,.tgz,.gz,.bz2,.xz,.zst,.lz4,.rar,.cbz,.cbr,.cbt,.cb7,.dmg,.iso,.wim,.jar,.apk,.ipa,.deb,.rpm,.cab,.appx"
        className="hidden"
        onChange={handleNativeArchiveInput}
      />

      {!loadedArchive ? (
        /* Empty Drop Target for Archive Inspection */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleZipFileDrop}
          className={`flex-1 m-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-8 transition-all ${
            isDragOver
              ? isDarkMode
                ? 'bg-blue-950/30 border-blue-500'
                : 'bg-blue-50/50 border-blue-500'
              : isDarkMode
              ? 'border-slate-800 bg-slate-900/30'
              : 'border-slate-300 bg-white/40'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
            <FolderArchive className="w-8 h-8" />
          </div>

          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            İncelemek veya Ayıklamak İçin Arşiv Bırakın
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            ZIP, 7Z, TAR, GZ, RAR, CBZ, ISO, APK, DMG ve 24+ arşiv formatını tarayıcı içinde yerel
            olarak açın, dosyaları inceleyin veya NPP Editör ile anında düzenleyin.
          </p>

          <div className="flex items-center gap-3 mt-6">
            <button
              id="btn-select-archive"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Arşiv Dosyası Seç
            </button>
          </div>
        </div>
      ) : (
        /* Archive Active Inspector View */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Archive Overview Bar */}
          <div
            className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 ${
              isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                <FolderArchive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {loadedArchive.fileName}
                  </h3>
                  {formatMeta && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase">
                      {formatMeta.name}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>Boyut: {formatBytes(loadedArchive.fileSize)}</span>
                  <span>•</span>
                  <span>{loadedArchive.filesCount} Dosya, {loadedArchive.foldersCount} Klasör</span>
                  <span>•</span>
                  <span>Açılmış Boyut: {formatBytes(loadedArchive.totalUncompressedSize)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Başka Arşiv Aç</span>
              </button>

              <button
                id="btn-extract-all"
                onClick={handleExtractAll}
                disabled={isExtracting}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-2xs transition-all active:scale-98 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExtracting ? 'Ayıklanıyor...' : 'Tümünü Ayıkla (.zip)'}</span>
              </button>
            </div>
          </div>

          {/* Entries Table */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div
              className={`rounded-xl border overflow-hidden ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div
                className={`px-4 py-2 border-b text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 flex items-center justify-between ${
                  isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span>İsim & Yol</span>
                <div className="flex items-center gap-8">
                  <span>Açılmış Boyut</span>
                  <span className="hidden sm:inline">Sıkıştırılmış</span>
                  <span>İşlemler</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredEntries.map((entry) => {
                  const cat = getFileCategory(entry.name);
                  const isTextOrCode =
                    cat.category === 'code' ||
                    cat.category === 'doc' ||
                    entry.name.endsWith('.txt') ||
                    entry.name.endsWith('.json') ||
                    entry.name.endsWith('.md');
                  return (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedEntryId(entry.id)}
                      onDoubleClick={() => handleEntryDoubleClick(entry)}
                      onContextMenu={(e) => handleContextMenu(e, entry)}
                      className={`px-4 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        selectedEntryId === entry.id
                          ? isDarkMode
                            ? 'bg-blue-900/30 ring-1 ring-blue-500/40'
                            : 'bg-blue-50 ring-1 ring-blue-500/30'
                          : isDarkMode
                          ? 'hover:bg-slate-800/40'
                          : 'hover:bg-slate-50'
                      }`}
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
                        <div className="truncate">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {entry.path}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 shrink-0">
                        <span className="font-mono text-slate-500 text-[11px]">
                          {formatBytes(entry.uncompressedSize)}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px] hidden sm:inline">
                          {entry.compressedSize > 0 ? formatBytes(entry.compressedSize) : '-'}
                        </span>

                        <div className="flex items-center gap-1">
                          {!entry.dir && isTextOrCode && onOpenInNpp && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEntryInNpp(entry);
                              }}
                              title="Notepad++ ile Düzenle"
                              className="p-1 rounded-md text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                            </button>
                          )}
                          {!entry.dir && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewEntry(entry);
                              }}
                              title="Önizleme (QuickLook)"
                              className="p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!entry.dir && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExtractSingle(entry);
                              }}
                              title="Tekil İndir"
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu Component */}
      <ContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
