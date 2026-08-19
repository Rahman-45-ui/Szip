import React, { useState } from 'react';
import {
  Sliders,
  Shield,
  FileArchive,
  Layers,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  Check,
  X,
  Dices,
  Zap,
  Info,
  Sparkles,
  CheckCircle2,
  HardDrive,
  Download,
  AlertCircle,
} from 'lucide-react';
import { ArchiveFormat, CompressionLevel, CompressionSettings, FileItem } from '../types';
import { formatBytes } from '../utils/formatters';
import { getFormatMeta, SUPPORTED_FORMATS } from '../utils/supportedFormats';
import { soundFx } from '../utils/audio';

interface Props {
  settings: CompressionSettings;
  setSettings: React.Dispatch<React.SetStateAction<CompressionSettings>>;
  files: FileItem[];
  isDarkMode: boolean;
  onCompress: () => void;
  isProcessing: boolean;
}

interface PasswordStrength {
  score: number; // 0 to 4
  label: string;
  color: string;
  barColor: string;
  hasMinLength: boolean;
  hasUpperLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Şifre Belirlenmedi',
      color: 'text-slate-400',
      barColor: 'bg-slate-300 dark:bg-slate-700',
      hasMinLength: false,
      hasUpperLower: false,
      hasNumber: false,
      hasSpecial: false,
    };
  }

  const hasMinLength = password.length >= 8;
  const hasGoodLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasUpperLower = hasUpper && hasLower;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let rawScore = 0;
  if (hasMinLength) rawScore += 1;
  if (hasGoodLength) rawScore += 1;
  if (hasUpperLower) rawScore += 1;
  if (hasNumber) rawScore += 1;
  if (hasSpecial) rawScore += 1;

  let score = 1;
  let label = 'Çok Zayıf';
  let color = 'text-red-500';
  let barColor = 'bg-red-500';

  if (rawScore <= 1) {
    score = 1;
    label = 'Çok Zayıf';
    color = 'text-red-500';
    barColor = 'bg-red-500';
  } else if (rawScore === 2) {
    score = 2;
    label = 'Zayıf';
    color = 'text-orange-500';
    barColor = 'bg-orange-500';
  } else if (rawScore === 3) {
    score = 3;
    label = 'Orta';
    color = 'text-amber-500';
    barColor = 'bg-amber-500';
  } else {
    score = 4;
    label = rawScore >= 5 ? 'Aşılmaz / Çok Güçlü' : 'Güçlü';
    color = 'text-emerald-500';
    barColor = 'bg-emerald-500';
  }

  return {
    score,
    label,
    color,
    barColor,
    hasMinLength,
    hasUpperLower,
    hasNumber,
    hasSpecial,
  };
}

export const InspectorPanel: React.FC<Props> = ({
  settings,
  setSettings,
  files,
  isDarkMode,
  onCompress,
  isProcessing,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const totalOriginalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const currentFormatMeta = getFormatMeta(settings.format);

  // Compression level presets
  const levels: { level: CompressionLevel; label: string; desc: string }[] = [
    { level: 0, label: '0 - Depola', desc: 'Sıkıştırmasız / Anlık Paketleme' },
    { level: 1, label: '1 - En Hızlı', desc: 'Düşük CPU / Hızlı Sıkıştırma' },
    { level: 3, label: '3 - Hızlı', desc: 'Dengeli Hız' },
    { level: 6, label: '6 - Dengeli', desc: 'Önerilen Standart Oran' },
    { level: 9, label: '9 - Ultra', desc: 'Maksimum Sıkıştırma Oranı' },
  ];

  const pwdStrength = calculatePasswordStrength(settings.password || '');

  // Helper to generate strong randomized password
  const handleGeneratePassword = () => {
    soundFx.playPop();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+';
    let generated = '';
    for (let i = 0; i < 14; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSettings((prev) => ({
      ...prev,
      password: generated,
    }));
  };

  return (
    <aside
      id="inspector-panel"
      className={`w-80 lg:w-96 border-l flex flex-col h-full overflow-y-auto select-none transition-colors ${
        isDarkMode
          ? 'bg-slate-900/95 border-slate-800 text-slate-200'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Header */}
      <div
        className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-500" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Sıkıştırma Parametreleri
          </span>
        </div>
        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
          {currentFormatMeta.ext}
        </span>
      </div>

      {/* Settings Form */}
      <div className="p-5 space-y-5 text-xs">
        {/* Section 1: Arşiv Adı ve Format */}
        <div className="space-y-3">
          <div>
            <label
              htmlFor="input-archive-name"
              className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              Arşiv Dosyası Adı
            </label>
            <div className="relative flex items-center">
              <input
                id="input-archive-name"
                type="text"
                value={settings.archiveName}
                onChange={(e) =>
                  setSettings({ ...settings, archiveName: e.target.value })
                }
                placeholder="szip_arsiv"
                className={`w-full px-3 py-2 rounded-lg border text-xs outline-none transition-colors font-mono ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                }`}
              />
              <span className="absolute right-2.5 text-[11px] font-mono text-slate-400">
                {currentFormatMeta.ext}
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="select-archive-format"
              className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              Hedef Format (24+ Destekli)
            </label>
            <select
              id="select-archive-format"
              value={settings.format}
              onChange={(e) => {
                soundFx.playClick();
                const fmt = e.target.value as ArchiveFormat;
                const meta = getFormatMeta(fmt);
                setSettings({
                  ...settings,
                  format: fmt,
                  level: meta.defaultLevel,
                });
              }}
              className={`w-full px-3 py-2 rounded-lg border text-xs outline-none transition-colors font-medium ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
              }`}
            >
              <optgroup label="Evrensel & Popüler">
                <option value="zip">ZIP - Evrensel Standart (.zip)</option>
                <option value="7z">7-Zip - Maksimum Oran (.7z)</option>
                <option value="rar">RAR - Roshal Archive (.rar)</option>
              </optgroup>
              <optgroup label="UNIX & DevOps">
                <option value="tgz">TAR.GZ / TGZ - Linux Standart (.tar.gz)</option>
                <option value="tar">TAR - Tape Archive (.tar)</option>
                <option value="gz">GZ - GNU Gzip Stream (.gz)</option>
                <option value="bz2">Bzip2 / TBZ2 (.tar.bz2)</option>
                <option value="xz">XZ / TXZ - LZMA2 (.tar.xz)</option>
                <option value="zst">Zstandard - ZSTD Ultra Hızlı (.tar.zst)</option>
                <option value="lz4">LZ4 - Ultra Hızlı Akış (.tar.lz4)</option>
              </optgroup>
              <optgroup label="Çizgi Roman & Medya">
                <option value="cbz">CBZ - Comic Book ZIP (.cbz)</option>
                <option value="cbr">CBR - Comic Book RAR (.cbr)</option>
                <option value="cbt">CBT - Comic Book TAR (.cbt)</option>
                <option value="cb7">CB7 - Comic Book 7Z (.cb7)</option>
              </optgroup>
              <optgroup label="Disk & Sanallaştırma">
                <option value="dmg">DMG - Apple Disk Image (.dmg)</option>
                <option value="iso">ISO - Optik Disk İmajı (.iso)</option>
                <option value="wim">WIM - Windows Imaging (.wim)</option>
              </optgroup>
              <optgroup label="Paket & Dağıtım">
                <option value="jar">JAR - Java Archive (.jar)</option>
                <option value="apk">APK - Android Package (.apk)</option>
                <option value="ipa">IPA - iOS App Package (.ipa)</option>
                <option value="deb">DEB - Debian / Ubuntu (.deb)</option>
                <option value="rpm">RPM - RedHat / Fedora (.rpm)</option>
                <option value="cab">CAB - Microsoft Cabinet (.cab)</option>
                <option value="appx">APPX / MSIX - Windows App (.msix)</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Section 2: Sıkıştırma Seviyesi Slider */}
        <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Sıkıştırma Seviyesi
            </label>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              Kademe {settings.level}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="9"
            step="1"
            value={settings.level}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              let nearestLevel: CompressionLevel = 6;
              if (val === 0) nearestLevel = 0;
              else if (val <= 2) nearestLevel = 1;
              else if (val <= 4) nearestLevel = 3;
              else if (val <= 7) nearestLevel = 6;
              else nearestLevel = 9;

              setSettings({ ...settings, level: nearestLevel });
            }}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0 Depola</span>
            <span>1 Hızlı</span>
            <span>6 Standart</span>
            <span>9 Ultra</span>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Algoritma & Hız:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {currentFormatMeta.compressionSpeed} / {currentFormatMeta.ratioScore}
            </span>
          </div>
        </div>

        {/* Section 3: Güvenlik & AES-256 Şifreleme */}
        <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Güvenlik & Parola
            </label>
            {settings.enableEncryption && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="w-3 h-3" />
                AES-256
              </span>
            )}
          </div>

          {/* Encryption Toggle */}
          <label
            htmlFor="chk-enable-encryption"
            className={`flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg transition-colors border ${
              settings.enableEncryption
                ? isDarkMode
                  ? 'bg-blue-950/30 border-blue-800/60'
                  : 'bg-blue-50/60 border-blue-200'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <input
              id="chk-enable-encryption"
              type="checkbox"
              checked={settings.enableEncryption}
              onChange={(e) => {
                soundFx.playClick();
                setSettings({
                  ...settings,
                  enableEncryption: e.target.checked,
                  password: e.target.checked ? settings.password || '' : '',
                });
              }}
              className="mt-0.5 rounded text-blue-600"
            />
            <div className="text-xs flex-1">
              <div className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                {settings.enableEncryption ? (
                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>AES-256 Parola Koruması</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Arşivi şifreleyerek yetkisiz erişimleri engeller.
              </p>
            </div>
          </label>

          {/* Password Input & Real-time Strength Meter */}
          {settings.enableEncryption && (
            <div
              id="inspector-password-box"
              className={`p-3 rounded-xl border space-y-2.5 ${
                isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-500" />
                  Parola Belirle
                </span>

                <button
                  type="button"
                  id="btn-inspector-gen-pwd"
                  onClick={handleGeneratePassword}
                  className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Dices className="w-3 h-3" />
                  <span>Rastgele Üret</span>
                </button>
              </div>

              {/* Password Input */}
              <div className="relative flex items-center">
                <input
                  id="inspector-pwd-input"
                  type={showPassword ? 'text' : 'password'}
                  value={settings.password || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, password: e.target.value })
                  }
                  placeholder="Güvenli bir parola girin..."
                  className={`w-full text-xs pl-2.5 pr-8 py-2 rounded-lg border outline-none font-mono transition-colors ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setShowPassword(!showPassword);
                  }}
                  className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Strength Meter */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Güvenlik Düzeyi:
                  </span>
                  <span className={`font-bold ${pwdStrength.color}`}>
                    {pwdStrength.label}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 h-1.5 w-full">
                  {[1, 2, 3, 4].map((step) => {
                    const isFilled =
                      pwdStrength.score >= step && (settings.password?.length || 0) > 0;
                    return (
                      <div
                        key={step}
                        className={`h-full rounded-full transition-all duration-200 ${
                          isFilled
                            ? pwdStrength.barColor
                            : isDarkMode
                            ? 'bg-slate-800'
                            : 'bg-slate-200'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Checklist Badges */}
                <div className="grid grid-cols-2 gap-1 pt-1 text-[10px]">
                  <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                      pwdStrength.hasMinLength
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium'
                        : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {pwdStrength.hasMinLength ? (
                      <Check className="w-2.5 h-2.5 shrink-0" />
                    ) : (
                      <X className="w-2.5 h-2.5 shrink-0 opacity-40" />
                    )}
                    <span>Min. 8 Karakter</span>
                  </div>

                  <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                      pwdStrength.hasUpperLower
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium'
                        : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {pwdStrength.hasUpperLower ? (
                      <Check className="w-2.5 h-2.5 shrink-0" />
                    ) : (
                      <X className="w-2.5 h-2.5 shrink-0 opacity-40" />
                    )}
                    <span>Büyük / Küçük</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Sistem Temizleme & Seçenekler */}
        <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Filtreler & Optimizasyon
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={settings.excludeMacJunk}
              onChange={(e) =>
                setSettings({ ...settings, excludeMacJunk: e.target.checked })
              }
              className="rounded text-blue-600"
            />
            <span className="text-slate-700 dark:text-slate-300">
              macOS / Windows metadata (.DS_Store, Thumbs.db) temizle
            </span>
          </label>
        </div>

        {/* Section 5: Özet & İşlem Butonu */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>Toplam Dosya:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {files.length} Adet
              </span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>Ham Boyut:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {formatBytes(totalOriginalBytes)}
              </span>
            </div>
          </div>

          <button
            id="btn-main-compress"
            disabled={files.length === 0 || isProcessing}
            onClick={onCompress}
            className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all ${
              files.length === 0 || isProcessing
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-98'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Arşiv Oluşturuluyor...'
                : `${currentFormatMeta.name.split(' ')[0]} Arşivini İndir`}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};
