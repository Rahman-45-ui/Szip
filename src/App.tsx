/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AppMode,
  ArchiveFormat,
  CompressionSettings,
  CustomizationSettings,
  DisplayLayout,
  FileItem,
  HistoryItem,
  LoadedArchive,
  PresetProfile,
  QuickLookFile,
  ViewTab,
} from './types';
import { soundFx } from './utils/audio';
import { createArchiveZip, triggerDownload } from './utils/zipEngine';
import { getFormatMeta } from './utils/supportedFormats';
import { Navbar } from './components/Navbar';
import { NormalView } from './components/NormalView';
import { InspectorPanel } from './components/InspectorPanel';
import { CompressView } from './components/CompressView';
import { ExtractView } from './components/ExtractView';
import { GitView } from './components/GitView';
import { CleanerTab } from './components/CleanerTab';
import { BatchConvertView } from './components/BatchConvertView';
import { HistoryView } from './components/HistoryView';
import { FormatsDirectoryView } from './components/FormatsDirectoryView';
import { QuickLookModal } from './components/QuickLookModal';
import { NppEditor } from './components/NppEditor';
import { PersonalizationModal } from './components/PersonalizationModal';
import { MediaConverterView } from './components/MediaConverterView';
import { FormatConverterModal } from './components/FormatConverterModal';
import { Footer } from './components/Footer';

const SETTINGS_STORAGE_KEY = 'szip_customization_v1';
const APP_MODE_STORAGE_KEY = 'szip_app_mode_v1';

const DEFAULT_SETTINGS: CustomizationSettings = {
  theme: 'dark',
  accent: 'blue',
  fontFamily: 'JetBrains Mono',
  fontSize: 13,
  uiDensity: 'comfortable',
  soundTheme: 'subtle',
  soundVolume: 0.6,
  nppLineWrap: true,
  nppMiniMap: false,
  nppShowInvisibles: false,
  nppTabSize: 2,
  doubleClickAction: 'npp',
  autoExcludeJunk: true,
  autoExifClean: false,
};

export default function App() {
  // App Mode (Normal vs Studio)
  const [appMode, setAppMode] = useState<AppMode>(() => {
    try {
      const savedMode = localStorage.getItem(APP_MODE_STORAGE_KEY);
      if (savedMode === 'normal' || savedMode === 'studio') {
        return savedMode;
      }
    } catch (e) {
      console.error(e);
    }
    return 'normal';
  });

  // Personalization settings
  const [customization, setCustomization] = useState<CustomizationSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SETTINGS;
  });

  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);
  const [isConverterModalOpen, setIsConverterModalOpen] = useState(false);

  // Sound and Inspector State
  const [soundEnabled, setSoundEnabled] = useState(customization.soundTheme !== 'off');
  const [showInspector, setShowInspector] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('compress');
  const [layout, setLayout] = useState<DisplayLayout>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNppDocId, setActiveNppDocId] = useState<string | undefined>(undefined);

  // Files in workspace
  const [filesToCompress, setFilesToCompress] = useState<FileItem[]>([]);
  const [quickLookFile, setQuickLookFile] = useState<QuickLookFile | null>(null);

  // Compression Settings for szip (24+ Formats)
  const [compressionSettings, setCompressionSettings] = useState<CompressionSettings>({
    archiveName: 'szip_arsiv',
    format: 'zip',
    level: 6,
    excludeMacJunk: true,
    enableEncryption: false,
    splitVolume: false,
    volumeSizeMB: 25,
    comment: 'szip Web Studio ile paketlendi',
    solidArchive: false,
  });

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  // History & Metrics
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Save settings when modified
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(customization));
    } catch (e) {
      console.error(e);
    }
  }, [customization]);

  // Save mode when modified
  useEffect(() => {
    try {
      localStorage.setItem(APP_MODE_STORAGE_KEY, appMode);
    } catch (e) {
      console.error(e);
    }
  }, [appMode]);

  // Global Keyboard Shortcut: Ctrl+M / Cmd+M to toggle Normal / Studio mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setAppMode((prev) => {
          const next = prev === 'normal' ? 'studio' : 'normal';
          soundFx.playSuccessChime();
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync theme class & sound settings
  const isDarkMode = customization.theme !== 'light';

  useEffect(() => {
    soundFx.setSoundEnabled(soundEnabled && customization.soundTheme !== 'off');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode, soundEnabled, customization.soundTheme]);

  const handleUpdateSettings = (newSettings: Partial<CustomizationSettings>) => {
    setCustomization((prev) => ({ ...prev, ...newSettings }));
  };

  const handleResetSettings = () => {
    setCustomization(DEFAULT_SETTINGS);
  };

  // Record History Helper
  const handleRecordHistory = (
    title: string,
    originalSize: number,
    processedSize: number,
    format: string
  ) => {
    const ratio =
      originalSize > 0
        ? Math.max(0, Math.round(((originalSize - processedSize) / originalSize) * 100))
        : 0;

    const newItem: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: title.includes('commit') || title.includes('git')
        ? 'git_commit'
        : title.includes('Temizlik')
        ? 'clean'
        : 'compress',
      title,
      timestamp: Date.now(),
      originalSize,
      processedSize,
      savingsRatio: ratio,
      format,
      fileCount: filesToCompress.length,
      status: 'success',
    };

    setHistory((prev) => [newItem, ...prev]);
  };

  const handleOpenInNpp = (file: FileItem) => {
    setActiveNppDocId(file.id);
    setActiveTab('npp');
    setAppMode('studio');
  };

  const handleOpenEntryInNpp = (entry: { id: string; name: string; path: string }, content: string) => {
    const newFileItem: FileItem = {
      id: entry.id,
      name: entry.name,
      path: entry.path,
      size: new TextEncoder().encode(content).byteLength,
      type: 'text/plain',
      lastModified: Date.now(),
      content,
    };
    setFilesToCompress((prev) => {
      if (prev.some((f) => f.id === entry.id || f.name === entry.name)) {
        return prev.map((f) => (f.id === entry.id || f.name === entry.name ? newFileItem : f));
      }
      return [...prev, newFileItem];
    });
    setActiveNppDocId(entry.id);
    setActiveTab('npp');
    setAppMode('studio');
  };

  // Main Real Compression Trigger
  const handleCompress = async () => {
    if (filesToCompress.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProgressPercent(10);
    setProgressStatus('Dosyalar işleniyor ve arşiv hazırlanıyor...');
    soundFx.playClick();

    try {
      // Step 1: Filter out Mac junk if setting is active
      const processedFiles = compressionSettings.excludeMacJunk
        ? filesToCompress.filter((f) => !f.isMacJunk)
        : filesToCompress;

      setProgressPercent(40);
      setProgressStatus('Sıkıştırma algoritmaları çalıştırılıyor...');

      // Step 2: Generate Real ZIP
      const { blob, fileName, originalSize, compressedSize } = await createArchiveZip(
        processedFiles,
        compressionSettings
      );

      setProgressPercent(85);
      setProgressStatus('İndirme dosyası hazırlandı.');

      // Step 3: Trigger Download
      triggerDownload(blob, fileName);

      setProgressPercent(100);
      setProgressStatus('Tamamlandı!');
      soundFx.playSuccessChime();

      // Record to history
      handleRecordHistory(
        `${compressionSettings.archiveName}.${compressionSettings.format}`,
        originalSize,
        compressedSize,
        compressionSettings.format.toUpperCase()
      );
    } catch (err) {
      console.error('Compression failed:', err);
      alert('Sıkıştırma sırasında bir hata oluştu: ' + (err as Error).message);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgressPercent(0);
        setProgressStatus('');
      }, 1200);
    }
  };

  // Format selection from directory view
  const handleSelectFormatFromDirectory = (fmt: ArchiveFormat) => {
    const meta = getFormatMeta(fmt);
    setCompressionSettings((prev) => ({
      ...prev,
      format: fmt,
      level: meta.defaultLevel,
    }));
    setActiveTab('compress');
    soundFx.playPop();
  };

  // Get background class based on theme
  const getThemeCanvasClass = () => {
    switch (customization.theme) {
      case 'oled':
        return 'bg-black text-white';
      case 'nord':
        return 'bg-[#2e3440] text-[#eceff4]';
      case 'dracula':
        return 'bg-[#282a36] text-[#f8f8f2]';
      case 'monokai':
        return 'bg-[#2d2a2e] text-[#fcfcfa]';
      case 'solarized':
        return 'bg-[#002b36] text-[#839496]';
      case 'synthwave':
        return 'bg-[#261435] text-[#f92aad]';
      case 'light':
        return 'bg-slate-100 text-slate-900';
      default:
        return 'bg-slate-950 text-slate-100';
    }
  };

  return (
    <div
      id="szip-root-container"
      style={{
        fontFamily: `${customization.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
        fontSize: `${customization.fontSize}px`,
      }}
      className={`min-h-screen flex flex-col transition-colors select-none ${getThemeCanvasClass()}`}
    >
      {/* Top Application Navbar with Mode Switcher */}
      <Navbar
        appMode={appMode}
        setAppMode={setAppMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        layout={layout}
        setLayout={setLayout}
        isDarkMode={isDarkMode}
        setIsDarkMode={(dark) =>
          handleUpdateSettings({ theme: dark ? 'dark' : 'light' })
        }
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        showInspector={showInspector}
        toggleInspector={() => setShowInspector(!showInspector)}
        onOpenPersonalization={() => setIsPersonalizationOpen(true)}
        onOpenConverter={() => setIsConverterModalOpen(true)}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* NORMAL MODE VIEW */}
        {appMode === 'normal' ? (
          <NormalView
            files={filesToCompress}
            setFiles={setFilesToCompress}
            compressionSettings={compressionSettings}
            setCompressionSettings={setCompressionSettings}
            onCompress={handleCompress}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            progressStatus={progressStatus}
            isDarkMode={isDarkMode}
            onPreviewFile={(f) => setQuickLookFile(f)}
            onSwitchToStudio={() => {
              setAppMode('studio');
              setActiveTab('compress');
            }}
            onOpenConverter={() => setIsConverterModalOpen(true)}
          />
        ) : (
          /* STUDIO MODE VIEWS */
          <>
            <main className="flex-1 flex flex-col overflow-hidden relative">
              {activeTab === 'compress' && (
                <CompressView
                  files={filesToCompress}
                  setFiles={setFilesToCompress}
                  layout={layout}
                  searchQuery={searchQuery}
                  isDarkMode={isDarkMode}
                  onPreviewFile={(f) => setQuickLookFile(f)}
                  onOpenInNpp={handleOpenInNpp}
                  onCompress={handleCompress}
                  isProcessing={isProcessing}
                  progressPercent={progressPercent}
                  progressStatus={progressStatus}
                  doubleClickAction={customization.doubleClickAction}
                />
              )}

              {activeTab === 'extract' && (
                <ExtractView
                  layout={layout}
                  searchQuery={searchQuery}
                  isDarkMode={isDarkMode}
                  onPreviewFile={(f) => setQuickLookFile(f)}
                  onOpenInNpp={handleOpenEntryInNpp}
                />
              )}

              {activeTab === 'converter' && (
                <MediaConverterView
                  isDarkMode={isDarkMode}
                  onRecordHistory={handleRecordHistory}
                />
              )}

              {activeTab === 'npp' && (
                <NppEditor
                  files={filesToCompress}
                  setFiles={setFilesToCompress}
                  isDarkMode={isDarkMode}
                  activeDocId={activeNppDocId}
                />
              )}

              {activeTab === 'git' && (
                <GitView
                  files={filesToCompress}
                  setFiles={setFilesToCompress}
                  isDarkMode={isDarkMode}
                  onOpenInNpp={handleOpenInNpp}
                  onRecordHistory={handleRecordHistory}
                />
              )}

              {activeTab === 'batch' && (
                <BatchConvertView
                  files={filesToCompress}
                  isDarkMode={isDarkMode}
                  onRecordHistory={handleRecordHistory}
                />
              )}

              {activeTab === 'cleaner' && (
                <CleanerTab
                  files={filesToCompress}
                  setFiles={setFilesToCompress}
                  isDarkMode={isDarkMode}
                  onRecordHistory={handleRecordHistory}
                />
              )}

              {activeTab === 'formats' && (
                <FormatsDirectoryView
                  isDarkMode={isDarkMode}
                  selectedFormat={compressionSettings.format}
                  onSelectFormat={handleSelectFormatFromDirectory}
                />
              )}

              {activeTab === 'history' && (
                <HistoryView
                  history={history}
                  setHistory={setHistory}
                  isDarkMode={isDarkMode}
                />
              )}
            </main>

            {/* Right Settings & Inspector Panel (Studio Compress Tab) */}
            {showInspector && activeTab === 'compress' && (
              <InspectorPanel
                settings={compressionSettings}
                setSettings={setCompressionSettings}
                files={filesToCompress}
                isDarkMode={isDarkMode}
                onCompress={handleCompress}
                isProcessing={isProcessing}
              />
            )}
          </>
        )}
      </div>

      {/* Main Footer with Screlia Labs Branding & SEO Value */}
      <Footer
        appMode={appMode}
        isDarkMode={isDarkMode}
        onSwitchMode={(mode) => setAppMode(mode)}
      />

      {/* Quick Look Modal Preview Overlay */}
      {quickLookFile && (
        <QuickLookModal
          file={quickLookFile}
          onClose={() => setQuickLookFile(null)}
          isDarkMode={isDarkMode}
          onOpenInNpp={(f) => {
            const fileItem: FileItem = {
              id: Math.random().toString(36).substring(2, 9),
              name: f.name,
              path: f.name,
              size: f.size,
              type: f.type,
              lastModified: f.date.getTime(),
              content: f.textContent,
            };
            handleOpenInNpp(fileItem);
          }}
        />
      )}

      {/* Deep Personalization Modal */}
      <PersonalizationModal
        isOpen={isPersonalizationOpen}
        onClose={() => setIsPersonalizationOpen(false)}
        settings={customization}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
      />

      {/* Media & File Format Converter Modal (MP3 to OPUS, PNG to JPEG, etc.) */}
      <FormatConverterModal
        isOpen={isConverterModalOpen}
        onClose={() => setIsConverterModalOpen(false)}
        isDarkMode={isDarkMode}
        onRecordHistory={handleRecordHistory}
      />
    </div>
  );
}
