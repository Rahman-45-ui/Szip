import React, { useRef, useState, useEffect } from 'react';
import {
  UploadCloud,
  FilePlus,
  FolderPlus,
  Trash2,
  Eye,
  Folder,
  FolderOpen,
  FileCode2,
  Edit3,
  Columns,
  LayoutList,
  Layers,
  ChevronRight,
  FolderTree as FolderTreeIcon,
  Download,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { ContextMenuState, DisplayLayout, FileItem, QuickLookFile } from '../types';
import { formatBytes, getFileCategory, isMacJunkFile } from '../utils/formatters';
import { soundFx } from '../utils/audio';
import { FolderTree } from './FolderTree';
import { ContextMenu } from './ContextMenu';
import { triggerDownload } from '../utils/zipEngine';

interface Props {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  layout: DisplayLayout;
  searchQuery: string;
  isDarkMode: boolean;
  onPreviewFile: (file: QuickLookFile) => void;
  onOpenInNpp?: (file: FileItem) => void;
  onCompress: () => void;
  isProcessing: boolean;
  progressPercent: number;
  progressStatus: string;
  doubleClickAction?: 'npp' | 'quicklook' | 'download';
}

export const CompressView: React.FC<Props> = ({
  files,
  setFiles,
  layout,
  searchQuery,
  isDarkMode,
  onPreviewFile,
  onOpenInNpp,
  onCompress,
  isProcessing,
  progressPercent,
  progressStatus,
  doubleClickAction = 'npp',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFolderTree, setShowFolderTree] = useState(true);
  const [activeFolderFilter, setActiveFolderFilter] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    actions: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Filter files by folder filter and search
  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.path.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFolderFilter) {
      return f.path.startsWith(activeFolderFilter + '/');
    }
    return true;
  });

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const junkCount = files.filter((f) => f.isMacJunk || isMacJunkFile(f.name)).length;

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && files.length > 0) {
        e.preventDefault();
        setSelectedIds(new Set(files.map((f) => f.id)));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          handleRemoveSelected();
        }
      } else if (e.key === ' ' && selectedIds.size === 1) {
        e.preventDefault();
        const selectedId = Array.from(selectedIds)[0];
        const selectedFile = files.find((f) => f.id === selectedId);
        if (selectedFile) handleQuickLook(selectedFile);
      } else if (e.key === 'Enter' && selectedIds.size === 1 && onOpenInNpp) {
        e.preventDefault();
        const selectedId = Array.from(selectedIds)[0];
        const selectedFile = files.find((f) => f.id === selectedId);
        if (selectedFile) onOpenInNpp(selectedFile);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, selectedIds, onOpenInNpp]);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    soundFx.playPop();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files) as File[];
      const prefix = activeFolderFilter ? `${activeFolderFilter}/` : '';
      const newItems: FileItem[] = [];

      for (const file of droppedFiles) {
        const buffer = await file.arrayBuffer();
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'file',
          path: `${prefix}${file.name}`,
          lastModified: file.lastModified,
          file: file,
          content: new Uint8Array(buffer),
          isMacJunk: isMacJunkFile(file.name),
        });
      }

      setFiles((prev) => [...prev, ...newItems]);
    }
  };

  const handleNativeFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      soundFx.playPop();
      const prefix = activeFolderFilter ? `${activeFolderFilter}/` : '';
      const fileList = Array.from(e.target.files) as File[];
      const newItems: FileItem[] = [];

      for (const file of fileList) {
        const buffer = await file.arrayBuffer();
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'file',
          path: file.webkitRelativePath ? file.webkitRelativePath : `${prefix}${file.name}`,
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

  // Open directory via window.showDirectoryPicker where supported
  const handleOpenFolderPicker = async () => {
    soundFx.playClick();
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-expect-error Directory Picker API
        const dirHandle = await window.showDirectoryPicker();
        const collectedFiles: FileItem[] = [];

        async function scanDirectory(handle: any, currentPath: string) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              const buffer = await file.arrayBuffer();
              collectedFiles.push({
                id: Math.random().toString(36).substring(2, 9),
                name: file.name,
                size: file.size,
                type: file.type || 'file',
                path: `${currentPath}${file.name}`,
                lastModified: file.lastModified,
                file: file,
                content: new Uint8Array(buffer),
                isMacJunk: isMacJunkFile(file.name),
              });
            } else if (entry.kind === 'directory') {
              await scanDirectory(entry, `${currentPath}${entry.name}/`);
            }
          }
        }

        await scanDirectory(dirHandle, `${dirHandle.name}/`);
        setFiles((prev) => [...prev, ...collectedFiles]);
        setActiveFolderFilter(dirHandle.name);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          folderInputRef.current?.click();
        }
      }
    } else {
      folderInputRef.current?.click();
    }
  };

  // Create Virtual Directory
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    soundFx.playPop();

    const parentPrefix = activeFolderFilter ? `${activeFolderFilter}/` : '';
    const folderPath = `${parentPrefix}${newFolderName.trim()}`;

    const placeholder: FileItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: '.keep',
      size: 0,
      type: 'text/plain',
      path: `${folderPath}/.keep`,
      lastModified: Date.now(),
      content: '',
      isFolder: false,
    };

    setFiles((prev) => [...prev, placeholder]);
    setActiveFolderFilter(folderPath);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleToggleSelect = (id: string, multi: boolean = false) => {
    soundFx.playClick();
    setSelectedIds((prev) => {
      const next = new Set(multi ? prev : []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRemoveSelected = () => {
    soundFx.playTrash();
    if (selectedIds.size === 0) {
      setFiles([]);
    } else {
      setFiles((prev) => prev.filter((f) => !selectedIds.has(f.id)));
      setSelectedIds(new Set());
    }
  };

  const handleRemoveJunk = () => {
    soundFx.playTrash();
    setFiles((prev) => prev.filter((f) => !f.isMacJunk && !isMacJunkFile(f.name)));
  };

  const handleQuickLook = (item: FileItem) => {
    soundFx.playPop();
    let textContent: string | undefined;
    let blobUrl: string | undefined;

    const isImg = /\.(png|jpg|jpeg|svg|gif|webp|ico|bmp)$/i.test(item.name);
    const isTxt = /\.(txt|md|json|ts|tsx|js|jsx|html|css|py|rs|go|sh|env|xml|yaml|sql)$/i.test(item.name);

    if (item.file) {
      if (isImg) {
        blobUrl = URL.createObjectURL(item.file);
      }
    } else if (item.content instanceof Uint8Array && isImg) {
      blobUrl = URL.createObjectURL(new Blob([item.content]));
    }

    if (typeof item.content === 'string') {
      textContent = item.content;
    } else if (item.content instanceof Uint8Array && isTxt) {
      try {
        textContent = new TextDecoder().decode(item.content);
      } catch {
        textContent = '';
      }
    }

    onPreviewFile({
      name: item.name,
      size: item.size,
      type: item.type,
      date: new Date(item.lastModified),
      textContent,
      blobUrl,
      isImage: isImg,
      isCode: isTxt,
    });
  };

  // Download Single File
  const handleDownloadSingle = (item: FileItem) => {
    soundFx.playClick();
    let blob: Blob;
    if (item.file) {
      blob = item.file;
    } else if (item.content instanceof Uint8Array) {
      blob = new Blob([item.content]);
    } else if (typeof item.content === 'string') {
      blob = new Blob([item.content], { type: 'text/plain;charset=utf-8' });
    } else {
      blob = new Blob([]);
    }
    triggerDownload(blob, item.name);
  };

  // Double Click Dispatcher
  const handleItemDoubleClick = (item: FileItem) => {
    const cat = getFileCategory(item.name);
    const isCodeOrText =
      cat.category === 'code' ||
      cat.category === 'doc' ||
      item.name.endsWith('.txt') ||
      item.name.endsWith('.json') ||
      item.name.endsWith('.md');

    if (doubleClickAction === 'download') {
      handleDownloadSingle(item);
    } else if (doubleClickAction === 'npp' && isCodeOrText && onOpenInNpp) {
      soundFx.playClick();
      onOpenInNpp(item);
    } else {
      handleQuickLook(item);
    }
  };

  // Right Click Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    soundFx.playClick();

    // Select this item
    setSelectedIds(new Set([item.id]));

    const cat = getFileCategory(item.name);
    const isCodeOrText =
      cat.category === 'code' ||
      cat.category === 'doc' ||
      item.name.endsWith('.txt') ||
      item.name.endsWith('.json') ||
      item.name.endsWith('.md');

    const actions = [
      ...(isCodeOrText && onOpenInNpp
        ? [
            {
              id: 'edit-npp',
              label: 'Notepad++ ile Düzenle',
              icon: 'edit',
              shortcut: '↵ Enter',
              action: () => onOpenInNpp(item),
            },
          ]
        : []),
      {
        id: 'quicklook',
        label: 'Hızlı Bakış (QuickLook)',
        icon: 'eye',
        shortcut: 'Space',
        action: () => handleQuickLook(item),
      },
      {
        id: 'download',
        label: 'Tekil Olarak İndir',
        icon: 'download',
        action: () => handleDownloadSingle(item),
      },
      {
        id: 'copy-path',
        label: 'Dosya Yolunu Kopyala',
        icon: 'copy',
        action: () => {
          navigator.clipboard.writeText(item.path);
          soundFx.playSuccessChime();
        },
      },
      {
        id: 'sep-1',
        label: '',
        separator: true,
        action: () => {},
      },
      {
        id: 'delete',
        label: 'Dosyayı Sil',
        icon: 'delete',
        shortcut: '⌫ Del',
        danger: true,
        action: () => {
          soundFx.playTrash();
          setFiles((prev) => prev.filter((f) => f.id !== item.id));
        },
      },
    ];

    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      title: item.name,
      subtitle: `${formatBytes(item.size)} • ${item.path}`,
      actions,
    });
  };

  return (
    <div id="compress-view" className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Hidden File / Folder Inputs */}
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

      {/* Top Banner: Quick Action & Folder Bar */}
      <div
        className={`px-4 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 select-none ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            id="btn-add-files"
            onClick={() => {
              soundFx.playClick();
              fileInputRef.current?.click();
            }}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Dosya Ekle</span>
          </button>

          <button
            id="btn-open-folder"
            onClick={handleOpenFolderPicker}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Klasör Aç</span>
          </button>

          <button
            onClick={() => setShowNewFolderModal(true)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
            <span>Yeni Klasör</span>
          </button>

          <button
            onClick={() => setShowFolderTree(!showFolderTree)}
            title={showFolderTree ? 'Klasör Gezginini Gizle' : 'Klasör Gezginini Göster'}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all cursor-pointer ${
              showFolderTree
                ? 'bg-blue-500/10 border-blue-500 text-blue-500 font-semibold'
                : isDarkMode
                ? 'border-slate-800 text-slate-400'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            <FolderTreeIcon className="w-3.5 h-3.5" />
          </button>

          {files.length > 0 && (
            <button
              id="btn-clear-files"
              onClick={handleRemoveSelected}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                isDarkMode
                  ? 'border-red-900/50 hover:bg-red-950/40 text-red-400'
                  : 'border-red-200 hover:bg-red-50 text-red-600'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {selectedIds.size > 0
                  ? `Seçilenleri Sil (${selectedIds.size})`
                  : 'Tümünü Temizle'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Area (Optional Folder Tree + Drop Target & File Explorer) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Folder Tree Sidebar */}
        {showFolderTree && files.length > 0 && (
          <FolderTree
            files={files}
            setFiles={setFiles}
            selectedFolder={activeFolderFilter}
            onSelectFolder={(folder) => setActiveFolderFilter(folder)}
            isDarkMode={isDarkMode}
            onOpenFolderClick={handleOpenFolderPicker}
            onNewFolderClick={() => setShowNewFolderModal(true)}
          />
        )}

        {/* Right Side: File List / Explorer View */}
        <div
          id="compress-drop-area"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          className={`flex-1 overflow-auto p-4 sm:p-6 relative transition-all ${
            isDragOver
              ? isDarkMode
                ? 'bg-blue-950/30 ring-2 ring-blue-500 ring-inset'
                : 'bg-blue-50/50 ring-2 ring-blue-500 ring-inset'
              : ''
          }`}
        >
          {files.length === 0 ? (
            /* Empty State / Drag & Drop Target */
            <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>

              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Dosya veya Klasörleri Buraya Bırakın
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                szip; PNG, JPEG, medya, kod ve belgelerinizi 24+ farklı arşiv formatında ultra hızlı
                bir şekilde sıkıştırır, metadata arındırır ve Notepad++ ile anında düzenlemenize imkan tanır.
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
                >
                  <FilePlus className="w-4 h-4" />
                  Dosya Seç
                </button>

                <button
                  onClick={handleOpenFolderPicker}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                      : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  Klasör Aç
                </button>
              </div>
            </div>
          ) : (
            /* File List / Grid / Columns */
            <div className="space-y-4">
              {/* Status & Junk Alert Banner */}
              <div
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                  isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {filteredFiles.length} Öğe ({formatBytes(totalBytes)})
                  </span>
                  {activeFolderFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium text-[11px]">
                      <Folder className="w-3 h-3" />
                      {activeFolderFilter}
                      <button
                        onClick={() => setActiveFolderFilter(null)}
                        className="hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedIds.size > 0 && (
                    <span className="text-slate-400 font-medium">
                      • {selectedIds.size} dosya seçili
                    </span>
                  )}
                </div>

                {junkCount > 0 && (
                  <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-lg border border-amber-500/20">
                    <span className="font-medium">
                      ⚠️ {junkCount} adet sistem çöpü (.DS_Store vb.) tespit edildi
                    </span>
                    <button
                      onClick={handleRemoveJunk}
                      className="underline font-bold hover:text-amber-500 ml-1 cursor-pointer"
                    >
                      Şimdi Temizle
                    </button>
                  </div>
                )}
              </div>

              {/* List Layout View */}
              {layout === 'list' && (
                <div
                  className={`rounded-xl border overflow-hidden ${
                    isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div
                    className={`px-4 py-2 border-b text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between select-none ${
                      isDarkMode ? 'bg-slate-900/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === files.length && files.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(files.map((f) => f.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        className="rounded text-blue-600 cursor-pointer"
                      />
                      <span>Dosya Adı</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <span>Boyut</span>
                      <span className="hidden sm:inline">Konum / Yol</span>
                      <span>İşlem</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredFiles.map((file) => {
                      const isSelected = selectedIds.has(file.id);
                      const cat = getFileCategory(file.name);
                      const isCodeOrText =
                        cat.category === 'code' ||
                        cat.category === 'doc' ||
                        file.name.endsWith('.txt') ||
                        file.name.endsWith('.json') ||
                        file.name.endsWith('.md');
                      return (
                        <div
                          key={file.id}
                          onClick={(e) => handleToggleSelect(file.id, e.shiftKey || e.metaKey)}
                          onDoubleClick={() => handleItemDoubleClick(file)}
                          onContextMenu={(e) => handleContextMenu(e, file)}
                          className={`px-4 py-2.5 flex items-center justify-between transition-colors cursor-pointer text-xs ${
                            isSelected
                              ? isDarkMode
                                ? 'bg-blue-900/30 ring-1 ring-blue-500/40'
                                : 'bg-blue-50 ring-1 ring-blue-500/30'
                              : isDarkMode
                              ? 'hover:bg-slate-800/40'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(file.id, true)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded text-blue-600 cursor-pointer"
                            />
                            <span
                              className={`w-6 h-6 rounded-md font-mono text-[9px] font-bold uppercase flex items-center justify-center border shrink-0 ${cat.color}`}
                            >
                              {cat.ext.substring(0, 3)}
                            </span>
                            <div className="truncate">
                              <div className="font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                                <span>{file.name}</span>
                                {file.isMacJunk && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-500 font-bold">
                                    Junk
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-8 shrink-0">
                            <span className="font-mono text-slate-500 text-[11px]">
                              {formatBytes(file.size)}
                            </span>
                            <span className="text-slate-400 text-[11px] truncate max-w-[120px] hidden sm:inline font-mono">
                              {file.path}
                            </span>
                            <div className="flex items-center gap-1">
                              {isCodeOrText && onOpenInNpp && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    soundFx.playClick();
                                    onOpenInNpp(file);
                                  }}
                                  title="Notepad++ ile Düzenle"
                                  className="p-1 rounded-md text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickLook(file);
                                }}
                                title="Önizleme (QuickLook)"
                                className="p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadSingle(file);
                                }}
                                title="İndir"
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  soundFx.playTrash();
                                  setFiles((prev) => prev.filter((f) => f.id !== file.id));
                                }}
                                title="Sil"
                                className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grid Layout View */}
              {layout === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedIds.has(file.id);
                    const cat = getFileCategory(file.name);
                    return (
                      <div
                        key={file.id}
                        onClick={(e) => handleToggleSelect(file.id, e.shiftKey || e.metaKey)}
                        onDoubleClick={() => handleItemDoubleClick(file)}
                        onContextMenu={(e) => handleContextMenu(e, file)}
                        className={`p-3 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all duration-150 relative ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                            : isDarkMode
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-bold uppercase mb-2 border ${cat.color}`}
                        >
                          {cat.ext.substring(0, 4)}
                        </div>
                        <div className="w-full text-xs font-medium text-slate-900 dark:text-slate-200 truncate">
                          {file.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {formatBytes(file.size)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Column Layout View */}
              {layout === 'column' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedIds.has(file.id);
                    const cat = getFileCategory(file.name);
                    return (
                      <div
                        key={file.id}
                        onClick={(e) => handleToggleSelect(file.id, e.shiftKey || e.metaKey)}
                        onDoubleClick={() => handleItemDoubleClick(file)}
                        onContextMenu={(e) => handleContextMenu(e, file)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                            : isDarkMode
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold uppercase border shrink-0 ${cat.color}`}
                          >
                            {cat.ext.substring(0, 3)}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                              {file.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {formatBytes(file.size)} • {file.path}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-blue-500" />
              Yeni Klasör Oluştur
            </h3>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Klasör adı (örn: Belgelerim)..."
              className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-white outline-hidden focus:border-blue-500 font-sans"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                İptal
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Oluştur
              </button>
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
