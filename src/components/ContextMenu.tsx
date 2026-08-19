import React, { useEffect, useRef } from 'react';
import { ContextMenuState } from '../types';
import {
  Edit3,
  Eye,
  Download,
  Trash2,
  Copy,
  FolderOpen,
  FileCheck2,
  FileCode2,
  Sparkles,
  GitBranch,
  Shield,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface Props {
  menu: ContextMenuState;
  onClose: () => void;
  isDarkMode: boolean;
}

export const ContextMenu: React.FC<Props> = ({ menu, onClose, isDarkMode }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!menu.isOpen) return null;

  // Calculate position to prevent overflowing screen edges
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const menuWidth = 230;
  const menuHeight = menu.actions.length * 36 + 60;

  let posX = menu.x;
  let posY = menu.y;

  if (posX + menuWidth > windowWidth - 10) {
    posX = windowWidth - menuWidth - 10;
  }
  if (posY + menuHeight > windowHeight - 10) {
    posY = windowHeight - menuHeight - 10;
  }

  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case 'edit':
        return <Edit3 className="w-3.5 h-3.5 text-blue-500" />;
      case 'eye':
        return <Eye className="w-3.5 h-3.5 text-emerald-500" />;
      case 'download':
        return <Download className="w-3.5 h-3.5 text-indigo-500" />;
      case 'delete':
        return <Trash2 className="w-3.5 h-3.5 text-red-500" />;
      case 'copy':
        return <Copy className="w-3.5 h-3.5 text-amber-500" />;
      case 'git':
        return <GitBranch className="w-3.5 h-3.5 text-orange-500" />;
      case 'shield':
        return <Shield className="w-3.5 h-3.5 text-purple-500" />;
      case 'tag':
        return <Tag className="w-3.5 h-3.5 text-cyan-500" />;
      default:
        return <FileCode2 className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${posY}px`, left: `${posX}px` }}
      className={`fixed z-50 min-w-[220px] rounded-xl border shadow-2xl backdrop-blur-xl p-1.5 animate-in fade-in zoom-in-95 duration-100 select-none ${
        isDarkMode
          ? 'bg-slate-900/95 border-slate-700/80 text-slate-200'
          : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-300/40'
      }`}
    >
      {menu.title && (
        <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 mb-1">
          <div className="text-[11px] font-semibold truncate text-slate-800 dark:text-white">
            {menu.title}
          </div>
          {menu.subtitle && (
            <div className="text-[10px] text-slate-400 truncate">{menu.subtitle}</div>
          )}
        </div>
      )}

      <div className="space-y-0.5">
        {menu.actions.map((act, index) => {
          if (act.separator) {
            return (
              <div
                key={`sep-${index}`}
                className="my-1 border-t border-slate-200 dark:border-slate-800/80"
              />
            );
          }

          return (
            <button
              key={act.id || index}
              onClick={() => {
                soundFx.playClick();
                act.action();
                onClose();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                act.danger
                  ? 'hover:bg-red-500/10 hover:text-red-500 text-red-400'
                  : isDarkMode
                  ? 'hover:bg-slate-800 text-slate-200 hover:text-white'
                  : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {renderIcon(act.icon)}
                <span className="truncate">{act.label}</span>
              </div>
              {act.shortcut && (
                <span className="text-[10px] text-slate-400 font-mono tracking-wider ml-3 shrink-0">
                  {act.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
