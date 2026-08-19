import React from 'react';
import {
  Archive,
  FolderArchive,
  FileArchive,
  RefreshCw,
  Sparkles,
  BookOpen,
  History,
  Sun,
  Moon,
  LayoutList,
  LayoutGrid,
  Columns,
  Search,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  FileCode2,
  FolderGit2,
  Palette,
  Zap,
  Sliders,
  Layers,
} from 'lucide-react';
import { AppMode, DisplayLayout, ViewTab } from '../types';
import { soundFx } from '../utils/audio';

interface Props {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  layout: DisplayLayout;
  setLayout: (layout: DisplayLayout) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  showInspector: boolean;
  toggleInspector: () => void;
  onOpenPersonalization: () => void;
  onOpenConverter: () => void;
}

export const Navbar: React.FC<Props> = ({
  appMode,
  setAppMode,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  layout,
  setLayout,
  isDarkMode,
  setIsDarkMode,
  soundEnabled,
  setSoundEnabled,
  showInspector,
  toggleInspector,
  onOpenPersonalization,
  onOpenConverter,
}) => {
  const studioTabs = [
    { id: 'compress' as ViewTab, label: 'Sıkıştır', icon: Archive },
    { id: 'extract' as ViewTab, label: 'Arşiv Aç', icon: FolderArchive },
    { id: 'converter' as ViewTab, label: 'Dönüştürücü', icon: RefreshCw, badge: 'Medya' },
    { id: 'npp' as ViewTab, label: 'NPP Editör', icon: FileCode2 },
    { id: 'git' as ViewTab, label: 'Git Stüdyo', icon: FolderGit2, badge: 'Git' },
    { id: 'cleaner' as ViewTab, label: 'Metadata & Gizlilik', icon: Sparkles },
    { id: 'batch' as ViewTab, label: 'Toplu Paketle', icon: Layers },
    { id: 'formats' as ViewTab, label: 'Format Rehberi', icon: BookOpen },
    { id: 'history' as ViewTab, label: 'Geçmiş', icon: History },
  ];

  return (
    <header
      id="main-app-navbar"
      className={`h-14 border-b flex items-center justify-between px-3 sm:px-6 select-none sticky top-0 z-30 transition-colors ${
        isDarkMode
          ? 'bg-slate-900/90 backdrop-blur-md border-slate-800 text-slate-100'
          : 'bg-white/90 backdrop-blur-md border-slate-200 text-slate-900'
      }`}
    >
      {/* Left: Brand Identity & Mode Switcher */}
      <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 overflow-hidden">
        {/* Brand */}
        <div
          onClick={() => {
            soundFx.playClick();
            setActiveTab('compress');
          }}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-500 transition-colors">
            <FileArchive className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white font-mono">
                szip
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider border hidden sm:inline ${
                  appMode === 'studio'
                    ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                }`}
              >
                {appMode === 'studio' ? 'Studio' : 'Klasik'}
              </span>
            </div>
            <span className="text-[9.5px] text-slate-400 font-medium tracking-tight -mt-0.5 hidden sm:inline">
              by{' '}
              <a
                href="https://screlia.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors"
              >
                screlia labs
              </a>
            </span>
          </div>
        </div>

        {/* PROMINENT MODE SWITCHER PILL (Normal vs Studio) */}
        <div
          id="mode-switcher-container"
          className={`p-0.5 rounded-xl border flex items-center shrink-0 ${
            isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            id="btn-mode-normal"
            onClick={() => {
              if (appMode !== 'normal') {
                soundFx.playPop();
                setAppMode('normal');
              }
            }}
            title="Sade ve hızlı arşivleme modu (Kısayol: Ctrl+M)"
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              appMode === 'normal'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Normal</span>
          </button>

          <button
            id="btn-mode-studio"
            onClick={() => {
              if (appMode !== 'studio') {
                soundFx.playSuccessChime();
                setAppMode('studio');
              }
            }}
            title="Gelişmiş geliştirici stüdyosu (Kısayol: Ctrl+M)"
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              appMode === 'studio'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio</span>
          </button>
        </div>

        {/* Primary Navigation Tabs (Active in Studio Mode) */}
        {appMode === 'studio' && (
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {studioTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => {
                    soundFx.playClick();
                    setActiveTab(tab.id);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20 shadow-2xs'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Right Controls: Search, Layout, Personalization & Theme */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Search Field for Files (Studio Mode) */}
        {appMode === 'studio' && (activeTab === 'compress' || activeTab === 'extract') && (
          <div className="relative hidden lg:flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Dosyalarda ara..."
              className={`w-32 xl:w-44 pl-8 pr-2.5 py-1 rounded-lg text-xs border outline-none transition-colors ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
              }`}
            />
          </div>
        )}

        {/* Layout Switcher (Compress & Extract only in Studio Mode) */}
        {appMode === 'studio' && (activeTab === 'compress' || activeTab === 'extract') && (
          <div
            className={`hidden sm:flex items-center p-0.5 rounded-lg border ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => {
                soundFx.playClick();
                setLayout('list');
              }}
              title="Liste Görünümü"
              className={`p-1 rounded-md transition-all cursor-pointer ${
                layout === 'list'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setLayout('grid');
              }}
              title="Izgara Görünümü"
              className={`p-1 rounded-md transition-all cursor-pointer ${
                layout === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setLayout('column');
              }}
              title="Sütun Görünümü"
              className={`p-1 rounded-md transition-all cursor-pointer ${
                layout === 'column'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Inspector Toggle (Studio Compress Tab) */}
        {appMode === 'studio' && activeTab === 'compress' && (
          <button
            id="btn-toggle-inspector"
            onClick={() => {
              soundFx.playClick();
              toggleInspector();
            }}
            title="Ayarlar & Denetçi Paneli"
            className={`px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              showInspector
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 font-semibold'
                : isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Parametreler</span>
          </button>
        )}

        {/* Quick Format Converter Button */}
        <button
          id="btn-nav-open-converter"
          onClick={() => {
            soundFx.playClick();
            onOpenConverter();
          }}
          title="Dosya & Medya Format Dönüştürücü (MP3 to OPUS, PNG to JPEG, vb.)"
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'converter' && appMode === 'studio'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : isDarkMode
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden lg:inline">Format Dönüştür</span>
        </button>

        {/* Personalization & Customization Button */}
        <button
          id="btn-personalization"
          onClick={() => {
            soundFx.playClick();
            onOpenPersonalization();
          }}
          title="Görünüm & Kişiselleştirme Ayarları"
          className={`px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden xl:inline">Özelleştir</span>
        </button>

        {/* Sound Toggle */}
        <button
          id="btn-toggle-sound"
          onClick={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            soundFx.setSoundEnabled(next);
            if (next) soundFx.playClick();
          }}
          title={soundEnabled ? 'Sesler Açık' : 'Sessiz Mod'}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Theme Dark/Light Toggle */}
        <button
          id="btn-toggle-theme"
          onClick={() => {
            soundFx.playClick();
            setIsDarkMode(!isDarkMode);
          }}
          title={isDarkMode ? 'Açık Mod' : 'Karanlık Mod'}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
