import React from 'react';
import {
  X,
  Palette,
  Type,
  Volume2,
  Sliders,
  Sparkles,
  MousePointerClick,
  Shield,
  Layers,
  Check,
  RotateCcw,
} from 'lucide-react';
import { AccentColor, CustomizationSettings, EditorFontFamily, SoundTheme, ThemeMode } from '../types';
import { soundFx } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: CustomizationSettings;
  onUpdateSettings: (newSettings: Partial<CustomizationSettings>) => void;
  onResetSettings: () => void;
}

const THEMES: { id: ThemeMode; label: string; bg: string; border: string; desc: string }[] = [
  { id: 'dark', label: 'Koyu Modern', bg: 'bg-slate-900', border: 'border-slate-700', desc: 'Standart profesyonel karanlık tema' },
  { id: 'light', label: 'Açık macOS', bg: 'bg-slate-100', border: 'border-slate-300', desc: 'Ferah ve yüksek kontrastlı aydınlık tema' },
  { id: 'oled', label: 'OLED Saf Siyah', bg: 'bg-black', border: 'border-neutral-800', desc: 'Gerçek siyah (#000000) kontrast' },
  { id: 'nord', label: 'Nord Arktik', bg: 'bg-[#2e3440]', border: 'border-[#4c566a]', desc: 'İskandinav soğuk mavi paleti' },
  { id: 'dracula', label: 'Dracula', bg: 'bg-[#282a36]', border: 'border-[#6272a4]', desc: 'Zengin mor ve pembe vurgulu karanlık' },
  { id: 'monokai', label: 'Monokai Pro', bg: 'bg-[#2d2a2e]', border: 'border-[#ffd866]/30', desc: 'Geliştiriciler için klasik kod şeması' },
  { id: 'solarized', label: 'Solarized Dark', bg: 'bg-[#002b36]', border: 'border-[#073642]', desc: 'Göz yormayan mavi-yeşil spektrum' },
  { id: 'synthwave', label: 'Synthwave 84', bg: 'bg-[#261435]', border: 'border-[#ff7edb]/40', desc: 'Neon 80\'ler siberpunk estetiği' },
];

const ACCENTS: { id: AccentColor; label: string; color: string; ring: string }[] = [
  { id: 'blue', label: 'Mavi', color: 'bg-blue-500', ring: 'ring-blue-500' },
  { id: 'emerald', label: 'Zümrüt', color: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { id: 'purple', label: 'Mor', color: 'bg-purple-500', ring: 'ring-purple-500' },
  { id: 'amber', label: 'Kehribar', color: 'bg-amber-500', ring: 'ring-amber-500' },
  { id: 'crimson', label: 'Kırmızı', color: 'bg-red-500', ring: 'ring-red-500' },
  { id: 'cyan', label: 'Turkuaz', color: 'bg-cyan-500', ring: 'ring-cyan-500' },
  { id: 'orange', label: 'Turuncu', color: 'bg-orange-500', ring: 'ring-orange-500' },
  { id: 'rose', label: 'Gül', color: 'bg-rose-500', ring: 'ring-rose-500' },
];

const FONTS: { id: EditorFontFamily; label: string }[] = [
  { id: 'JetBrains Mono', label: 'JetBrains Mono (Önerilen)' },
  { id: 'Fira Code', label: 'Fira Code' },
  { id: 'Source Code Pro', label: 'Source Code Pro' },
  { id: 'Roboto Mono', label: 'Roboto Mono' },
  { id: 'Cascadia Code', label: 'Cascadia Code' },
  { id: 'Consolas', label: 'Consolas' },
  { id: 'Menlo', label: 'Menlo' },
];

const SOUND_THEMES: { id: SoundTheme; label: string; desc: string }[] = [
  { id: 'subtle', label: 'Zarif & Sade (Varsayılan)', desc: 'Hafif, dikkat dağıtmayan ses efektleri' },
  { id: 'modern', label: 'Modern UI Pop', desc: 'Canlı ve tatmin edici tıklama sesleri' },
  { id: 'mechanical', label: 'Mekanik Klavye', desc: 'Daktilo ve tuş tıkırtısı hissi' },
  { id: 'retro_mac', label: 'Retro Mac Arşiv', desc: 'Klasik masaüstü sistem sesleri' },
  { id: 'off', label: 'Tamamen Sessiz (Mute)', desc: 'Hiçbir ses çalınmaz' },
];

export const PersonalizationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
}) => {
  if (!isOpen) return null;

  const isDark = settings.theme !== 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in select-none">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Gelişmiş Kişiselleştirme & Ayarlar</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                szip stüdyonuzun temasını, renklerini, yazı tiplerini ve ses paketlerini özelleştirin.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs / Sections */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Themes */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-500" />
              Görsel Tema Seçimi ({THEMES.length} Tema)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {THEMES.map((th) => {
                const active = settings.theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => {
                      soundFx.playPop();
                      onUpdateSettings({ theme: th.id });
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      th.bg
                    } ${
                      active
                        ? 'ring-2 ring-blue-500 border-blue-500 shadow-md scale-[1.02]'
                        : 'border-slate-700/60 hover:border-slate-500 hover:scale-[1.01]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${th.id === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          {th.label}
                        </span>
                        {active && (
                          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className={`text-[10px] line-clamp-2 ${th.id === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                        {th.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Accent Colors */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Vurgu Rengi (Accent Color)
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {ACCENTS.map((acc) => {
                const active = settings.accent === acc.id;
                return (
                  <button
                    key={acc.id}
                    onClick={() => {
                      soundFx.playPop();
                      onUpdateSettings({ accent: acc.id });
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      active
                        ? 'border-blue-500 bg-blue-500/10 font-bold'
                        : isDark
                        ? 'border-slate-800 bg-slate-850 hover:border-slate-700 text-slate-300'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${acc.color} shrink-0`} />
                    <span>{acc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Typography & Font Family */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <Type className="w-4 h-4 text-emerald-500" />
                Kod & Metin Yazı Tipi
              </h3>
              <select
                value={settings.fontFamily}
                onChange={(e) => {
                  soundFx.playClick();
                  onUpdateSettings({ fontFamily: e.target.value as EditorFontFamily });
                }}
                className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-hidden ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Yazı Boyutu</span>
                <span className="text-blue-500 font-mono">{settings.fontSize}px</span>
              </h3>
              <input
                type="range"
                min="11"
                max="18"
                step="1"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>11px (Kompakt)</span>
                <span>14px (Standart)</span>
                <span>18px (Büyük)</span>
              </div>
            </div>
          </div>

          {/* Section 4: Sound Theme & Volume */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-500" />
                Ses & Tıklama Efekt Paketi
              </h3>
              <select
                value={settings.soundTheme}
                onChange={(e) => {
                  const val = e.target.value as SoundTheme;
                  onUpdateSettings({ soundTheme: val });
                  if (val !== 'off') soundFx.playPop();
                }}
                className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-hidden ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {SOUND_THEMES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Arayüz Yoğunluğu (Density)</span>
                <span className="text-blue-500 uppercase text-[10px] font-bold">
                  {settings.uiDensity}
                </span>
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {(['compact', 'comfortable', 'spacious'] as const).map((den) => (
                  <button
                    key={den}
                    onClick={() => {
                      soundFx.playClick();
                      onUpdateSettings({ uiDensity: den });
                    }}
                    className={`py-2 rounded-lg border text-xs font-semibold capitalize transition-all ${
                      settings.uiDensity === den
                        ? 'bg-blue-500 text-white border-blue-500'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {den === 'compact' ? 'Kompakt' : den === 'comfortable' ? 'Dengeli' : 'Geniş'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Double-Click Behavior & Automations */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-cyan-500" />
              Tıklanabilirlik & Otomasyon Tercihleri
            </h3>
            <div className="space-y-2">
              {/* Double Click Behavior */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">Çift Tıklama Eylemi</div>
                  <div className="text-[11px] text-slate-400">
                    Dosyalara çift tıklandığında yapılacak varsayılan işlem
                  </div>
                </div>
                <select
                  value={settings.doubleClickAction}
                  onChange={(e) => {
                    soundFx.playClick();
                    onUpdateSettings({
                      doubleClickAction: e.target.value as 'npp' | 'quicklook' | 'download',
                    });
                  }}
                  className={`p-2 rounded-lg border text-xs font-medium ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                >
                  <option value="npp">📝 Notepad++ Editörde Aç</option>
                  <option value="quicklook">👁️ QuickLook Önizlemesini Aç</option>
                  <option value="download">📥 Doğrudan İndir</option>
                </select>
              </div>

              {/* Auto Exclude Junk */}
              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">Sistem Çöplerini Otomatik Filtrele</div>
                  <div className="text-[11px] text-slate-400">
                    .DS_Store, __MACOSX, Thumbs.db dosyalarını arşivlemeden önce otomatik ayıklar.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoExcludeJunk}
                  onChange={(e) => {
                    soundFx.playPop();
                    onUpdateSettings({ autoExcludeJunk: e.target.checked });
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              {/* Auto EXIF / GPS Clean */}
              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">Görüntü Metadata/GPS Otomatik Arındır</div>
                  <div className="text-[11px] text-slate-400">
                    Yüklenen JPEG/PNG resimlerdeki gizli konum ve kamera imzalarını korumalı olarak temizler.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoExifClean}
                  onChange={(e) => {
                    soundFx.playPop();
                    onUpdateSettings({ autoExifClean: e.target.checked });
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              soundFx.playClick();
              onResetSettings();
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Varsayılana Sıfırla</span>
          </button>

          <button
            onClick={() => {
              soundFx.playSuccessChime();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20"
          >
            Tamam & Uygula
          </button>
        </div>
      </div>
    </div>
  );
};
