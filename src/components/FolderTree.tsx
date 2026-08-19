import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Trash2,
  Upload,
  Files,
} from 'lucide-react';
import { FileItem } from '../types';
import { formatBytes, getFileCategory } from '../utils/formatters';
import { soundFx } from '../utils/audio';

interface FolderTreeNode {
  name: string;
  fullPath: string;
  subfolders: Record<string, FolderTreeNode>;
  files: FileItem[];
  totalSize: number;
}

interface Props {
  files: FileItem[];
  setFiles?: React.Dispatch<React.SetStateAction<FileItem[]>>;
  selectedFolder: string | null;
  onSelectFolder: (folderPath: string | null) => void;
  isDarkMode: boolean;
  onOpenFolderClick?: () => void;
  onNewFolderClick?: () => void;
}

export const FolderTree: React.FC<Props> = ({
  files,
  setFiles,
  selectedFolder,
  onSelectFolder,
  isDarkMode,
  onOpenFolderClick,
  onNewFolderClick,
}) => {
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());

  // Build hierarchical folder tree from file paths
  const rootNode: FolderTreeNode = {
    name: '',
    fullPath: '',
    subfolders: {},
    files: [],
    totalSize: 0,
  };

  files.forEach((file) => {
    const rawPath = file.path || file.name;
    const parts = rawPath.split('/').filter(Boolean);
    let curr = rootNode;
    curr.totalSize += file.size || 0;

    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      const partialPath = parts.slice(0, i + 1).join('/');
      if (!curr.subfolders[seg]) {
        curr.subfolders[seg] = {
          name: seg,
          fullPath: partialPath,
          subfolders: {},
          files: [],
          totalSize: 0,
        };
      }
      curr = curr.subfolders[seg];
      curr.totalSize += file.size || 0;
    }

    curr.files.push(file);
  });

  const toggleCollapse = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playClick();
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: FolderTreeNode, depth: number = 0) => {
    const hasChildren = Object.keys(node.subfolders).length > 0 || node.files.length > 0;
    const isCollapsed = collapsedPaths.has(node.fullPath);
    const isSelected = selectedFolder === node.fullPath;

    return (
      <div key={node.fullPath} className="text-xs select-none">
        {/* Folder row */}
        <div
          onClick={() => {
            soundFx.playClick();
            onSelectFolder(node.fullPath === selectedFolder ? null : node.fullPath);
          }}
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? isDarkMode
                ? 'bg-blue-900/40 text-blue-300 font-semibold'
                : 'bg-blue-50 text-blue-700 font-semibold'
              : isDarkMode
              ? 'hover:bg-slate-800/60 text-slate-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                onClick={(e) => toggleCollapse(node.fullPath, e)}
                className="p-0.5 rounded hover:bg-slate-500/20 text-slate-400"
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <div className="w-3.5" />
            )}

            {isCollapsed ? (
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
            )}

            <span className="truncate font-medium">{node.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[10px] text-slate-400">
              {formatBytes(node.totalSize)}
            </span>
          </div>
        </div>

        {/* Subfolders & Files if not collapsed */}
        {!isCollapsed && (
          <div>
            {Object.values(node.subfolders).map((sub) => renderNode(sub, depth + 1))}

            {/* Render files in this folder */}
            {node.files.map((file) => {
              const cat = getFileCategory(file.name);
              return (
                <div
                  key={file.id}
                  className={`flex items-center justify-between py-1 px-2 rounded-lg transition-colors text-[11px] ${
                    isDarkMode ? 'hover:bg-slate-800/30 text-slate-400' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                  style={{ paddingLeft: `${(depth + 1) * 14 + 18}px` }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded text-[8px] font-mono font-bold flex items-center justify-center border shrink-0 ${cat.color}`}
                    >
                      {cat.ext.substring(0, 3)}
                    </span>
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {formatBytes(file.size)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const hasSubfolders = Object.keys(rootNode.subfolders).length > 0;

  return (
    <div
      className={`w-64 border-r flex flex-col h-full overflow-hidden ${
        isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50/50 border-slate-200'
      }`}
    >
      {/* Folder Tree Header Toolbar */}
      <div
        className={`p-2.5 border-b flex items-center justify-between gap-1 text-xs ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
          <Folder className="w-4 h-4 text-amber-500" />
          <span>Klasörler</span>
        </div>

        <div className="flex items-center gap-1">
          {onNewFolderClick && (
            <button
              onClick={onNewFolderClick}
              title="Yeni Klasör Oluştur"
              className={`p-1 rounded-md border transition-colors ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
            </button>
          )}

          {onOpenFolderClick && (
            <button
              onClick={onOpenFolderClick}
              title="Klasör Aç (Yerel Sistem)"
              className={`p-1 rounded-md border transition-colors ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
            </button>
          )}
        </div>
      </div>

      {/* All Files Root Item */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            soundFx.playClick();
            onSelectFolder(null);
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
            selectedFolder === null
              ? isDarkMode
                ? 'bg-blue-900/40 text-blue-300 font-semibold'
                : 'bg-blue-50 text-blue-700 font-semibold'
              : isDarkMode
              ? 'hover:bg-slate-800/60 text-slate-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Files className="w-4 h-4 text-blue-500" />
            <span>Tüm Dosyalar</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            {formatBytes(rootNode.totalSize)}
          </span>
        </button>
      </div>

      {/* Direct Subfolders & Root Files List (No fake 'Kök Klasör' wrapper node) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {hasSubfolders ? (
          Object.values(rootNode.subfolders).map((sub) => renderNode(sub, 0))
        ) : (
          <div className="p-3 text-center text-slate-400 text-[11px]">
            Alt klasör bulunmuyor
          </div>
        )}

        {/* Top-level files outside subfolders */}
        {rootNode.files.length > 0 && hasSubfolders && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60">
            <div className="text-[10px] font-semibold text-slate-400 px-2 mb-1 uppercase tracking-wider">
              Kök Dosyalar
            </div>
            {rootNode.files.map((file) => {
              const cat = getFileCategory(file.name);
              return (
                <div
                  key={file.id}
                  className={`flex items-center justify-between py-1 px-2 rounded-lg transition-colors text-[11px] ${
                    isDarkMode ? 'hover:bg-slate-800/30 text-slate-400' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded text-[8px] font-mono font-bold flex items-center justify-center border shrink-0 ${cat.color}`}
                    >
                      {cat.ext.substring(0, 3)}
                    </span>
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {formatBytes(file.size)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
