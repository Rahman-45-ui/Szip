import React, { useState, useRef } from 'react';
import {
  RefreshCw,
  Music,
  Image as ImageIcon,
  FileText,
  UploadCloud,
  ArrowRight,
  Download,
  CheckCircle2,
  Sliders,
  Sparkles,
  Zap,
  Volume2,
  Eye,
  Trash2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Play,
  Pause,
  Layers,
  FileCode2,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { formatBytes } from '../utils/formatters';
import {
  convertAudioFile,
  convertImageFile,
  convertTextDocument,
  AudioTargetFormat,
  ImageTargetFormat,
  DataTargetFormat,
  ConversionResult,
} from '../utils/mediaConverter';
import { triggerDownload } from '../utils/zipEngine';

interface Props {
  isDarkMode: boolean;
  onRecordHistory?: (title: string, orig: number, processed: number, format: string) => void;
}

interface QueuedMediaFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  category: 'audio' | 'image' | 'document';
  targetFormat: string;
  status: 'idle' | 'converting' | 'done' | 'error';
  result?: ConversionResult;
  error?: string;
  previewUrl?: string;
}

export const MediaConverterView: React.FC<Props> = ({ isDarkMode, onRecordHistory }) => {
  const [activeCategory, setActiveCategory] = useState<'audio' | 'image' | 'data'>('audio');
  const [queue, setQueue] = useState<QueuedMediaFile[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Audio global settings
  const [audioTargetFormat, setAudioTargetFormat] = useState<AudioTargetFormat>('opus');
  const [audioBitrate, setAudioBitrate] = useState<number>(128000); // 128 kbps

  // Image global settings
  const [imageTargetFormat, setImageTargetFormat] = useState<ImageTargetFormat>('jpeg');
  const [imageQuality, setImageQuality] = useState<number>(0.9);
  const [imageMaxWidth, setImageMaxWidth] = useState<number>(0);

  // Data / Text conversion state
  const [dataInput, setDataInput] = useState<string>(
    '{\n  "name": "szip",\n  "creator": "screlia labs",\n  "version": "2.4.0",\n  "features": ["audio-converter", "image-converter", "code-editor"]\n}'
  );
  const [dataTargetFormat, setDataTargetFormat] = useState<DataTargetFormat>('yaml');
  const [dataOutput, setDataOutput] = useState<string>('');
  const [dataError, setDataError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect file category
  const detectCategory = (file: File): 'audio' | 'image' | 'document' => {
    if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|opus|aac|m4a|flac|wma)$/i.test(file.name)) {
      return 'audio';
    }
    if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|avif|bmp|gif|ico|svg)$/i.test(file.name)) {
      return 'image';
    }
    return 'document';
  };

  // Add files to queue
  const handleAddFiles = (files: FileList | File[]) => {
    soundFx.playPop();
    const newItems: QueuedMediaFile[] = [];

    Array.from(files).forEach((file) => {
      const cat = detectCategory(file);
      const defaultTarget =
        cat === 'audio' ? audioTargetFormat : cat === 'image' ? imageTargetFormat : 'yaml';

      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        category: cat,
        targetFormat: defaultTarget,
        status: 'idle',
        previewUrl: cat === 'image' ? URL.createObjectURL(file) : undefined,
      });
    });

    setQueue((prev) => [...prev, ...newItems]);
  };

  // Convert Single Item
  const handleConvertItem = async (item: QueuedMediaFile) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'converting', error: undefined } : q))
    );
    soundFx.playClick();

    try {
      let res: ConversionResult;

      if (item.category === 'audio') {
        res = await convertAudioFile(item.file, item.name, item.targetFormat as AudioTargetFormat, {
          bitrate: audioBitrate,
        });
      } else if (item.category === 'image') {
        res = await convertImageFile(item.file, item.name, item.targetFormat as ImageTargetFormat, {
          quality: imageQuality,
          maxWidth: imageMaxWidth > 0 ? imageMaxWidth : undefined,
        });
      } else {
        throw new Error('Belgeler için lütfen alttaki veri dönüştürücüsünü kullanın.');
      }

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'done', result: res } : q))
      );
      soundFx.playSuccessChime();

      if (onRecordHistory) {
        onRecordHistory(
          `Format Dönüşümü (${item.name} ➔ ${item.targetFormat.toUpperCase()})`,
          item.size,
          res.convertedSize,
          item.targetFormat.toUpperCase()
        );
      }
    } catch (err) {
      console.error('Conversion error:', err);
      const errMsg = (err as Error).message || 'Dönüştürme başarısız.';
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'error', error: errMsg } : q))
      );
      soundFx.playTrash();
    }
  };

  // Convert All Queue
  const handleConvertAll = async () => {
    if (queue.length === 0 || isProcessingAll) return;
    setIsProcessingAll(true);

    for (const item of queue) {
      if (item.status !== 'done') {
        await handleConvertItem(item);
      }
    }

    setIsProcessingAll(false);
  };

  // Handle live data conversion
  const handleConvertData = () => {
    setDataError('');
    try {
      const res = convertTextDocument(dataInput, 'json', dataTargetFormat);
      setDataOutput(res.output);
      soundFx.playPop();
    } catch (err) {
      setDataError((err as Error).message);
      soundFx.playTrash();
    }
  };

  const audioFormats: { id: AudioTargetFormat; label: string; desc: string; badge: string }[] = [
    { id: 'opus', label: 'OPUS (.opus)', desc: 'Ultra yüksek sıkıştırma & stüdyo kalitesi', badge: 'Önerilen' },
    { id: 'wav', label: 'WAV (.wav)', desc: 'Kayıpsız 16-bit PCM stüdyo ham ses', badge: 'Kayıpsız' },
    { id: 'ogg', label: 'OGG (.ogg)', desc: 'Vorbis açık kaynak oyun ve web formatı', badge: 'Web' },
    { id: 'webm', label: 'WEBM (.webm)', desc: 'Modern HTML5 web medya formatı', badge: 'HTML5' },
  ];

  const imageFormats: { id: ImageTargetFormat; label: string; desc: string; badge: string }[] = [
    { id: 'jpeg', label: 'JPEG / JPG (.jpg)', desc: 'Küçük dosya boyutu, fotoğraflar için ideal', badge: 'Fotoğraf' },
    { id: 'png', label: 'PNG (.png)', desc: 'Şeffaflık destekli kayıpsız grafik kalitesi', badge: 'Grafik' },
    { id: 'webp', label: 'WEBP (.webp)', desc: 'Google yeni nesil süper sıkıştırma', badge: 'Modern Web' },
    { id: 'avif', label: 'AVIF (.avif)', desc: 'Yeni nesil AV1 tabanlı üstün sıkıştırma', badge: 'Yeni Nesil' },
    { id: 'bmp', label: 'BMP (.bmp)', desc: 'Sıkıştırmasız Windows bitmap formatı', badge: 'Klasik' },
    { id: 'ico', label: 'ICO (.ico)', desc: 'Web sitesi favicon simgesi', badge: 'Favicon' },
  ];

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 sm:p-6 space-y-6 select-none max-w-7xl mx-auto w-full">
      {/* Top Banner with Screlia Labs Referral */}
      <div
        className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
          isDarkMode
            ? 'bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-slate-900 border-slate-800'
            : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-white border-blue-100 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Evrensel Dosya & Medya Format Dönüştürücü
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                100% Yerel Motor
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              MP3, WAV, OPUS, OGG sesleri ve PNG, JPEG, WEBP, AVIF görselleri ile JSON/YAML verilerini anında tarayıcınızda dönüştürün.
            </p>
          </div>
        </div>

        {/* Screlia Labs Link Button */}
        <a
          href="https://screlia.com"
          target="_blank"
          rel="noopener noreferrer"
          title="screlia labs web sitesini ziyaret et"
          className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700/60 text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs shrink-0 cursor-pointer group"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-12 transition-transform" />
          <span>screlia labs</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div
          className={`p-1 rounded-xl border flex items-center gap-1 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => {
              soundFx.playClick();
              setActiveCategory('audio');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeCategory === 'audio'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Ses Dönüştürücü (MP3, OPUS, WAV)</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveCategory('image');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeCategory === 'image'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Görsel Dönüştürücü (PNG, JPEG, WEBP)</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveCategory('data');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeCategory === 'data'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>Veri & Kod (JSON, YAML, CSV)</span>
          </button>
        </div>

        {/* Global Action */}
        {activeCategory !== 'data' && queue.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playTrash();
                setQueue([]);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
            >
              Listeyi Temizle
            </button>
            <button
              onClick={handleConvertAll}
              disabled={isProcessingAll}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Tümünü Dönüştür ({queue.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* AUDIO & IMAGE CONVERTER VIEW */}
      {activeCategory !== 'data' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main: Dropzone & File Queue (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files) handleAddFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                isDragOver
                  ? isDarkMode
                    ? 'bg-blue-950/40 border-blue-500 ring-4 ring-blue-500/20'
                    : 'bg-blue-50 border-blue-500 ring-4 ring-blue-500/20'
                  : isDarkMode
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-300 hover:border-slate-400 shadow-2xs'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={
                  activeCategory === 'audio'
                    ? 'audio/*,.mp3,.wav,.ogg,.opus,.aac,.m4a,.flac,.webm'
                    : 'image/*,.png,.jpg,.jpeg,.webp,.avif,.bmp,.gif,.ico,.svg'
                }
                onChange={(e) => {
                  if (e.target.files) handleAddFiles(e.target.files);
                }}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {activeCategory === 'audio' ? 'Ses Dosyalarını Buraya Bırakın' : 'Görselleri Buraya Bırakın'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                veya bilgisayarınızdan seçmek için tıklayın ({activeCategory === 'audio' ? 'MP3, WAV, OGG, AAC, M4A, FLAC' : 'PNG, JPG, WEBP, AVIF, BMP'})
              </p>
            </div>

            {/* Queue List */}
            {queue.length > 0 && (
              <div
                className={`rounded-2xl border overflow-hidden ${
                  isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="p-3 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Dönüştürme Kuyruğu ({queue.length} Dosya)</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Toplam: {formatBytes(queue.reduce((acc, q) => acc + q.size, 0))}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-96 overflow-y-auto">
                  {queue.map((item) => {
                    const isAudio = item.category === 'audio';
                    const isImage = item.category === 'image';

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* File details */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                              {isAudio ? <Music className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="font-mono">{formatBytes(item.size)}</span>
                              <span>•</span>
                              <span className="uppercase text-[10px] font-bold text-blue-500">
                                Hedef: {item.targetFormat.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Conversion Status & Action */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {item.status === 'idle' && (
                            <button
                              onClick={() => handleConvertItem(item)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Dönüştür</span>
                            </button>
                          )}

                          {item.status === 'converting' && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-blue-500">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>İşleniyor...</span>
                            </div>
                          )}

                          {item.status === 'done' && item.result && (
                            <div className="flex items-center gap-2">
                              <div className="text-right hidden sm:block">
                                <span className="text-[11px] font-mono font-bold text-emerald-500 block">
                                  {formatBytes(item.result.convertedSize)}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  %{item.result.savingsPercent} tasarruf
                                </span>
                              </div>

                              <button
                                onClick={() => {
                                  if (item.result) {
                                    triggerDownload(item.result.blob, item.result.fileName);
                                    soundFx.playSuccessChime();
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>İndir</span>
                              </button>
                            </div>
                          )}

                          {item.status === 'error' && (
                            <span className="text-xs text-red-500 font-semibold" title={item.error}>
                              Hata!
                            </span>
                          )}

                          <button
                            onClick={() => {
                              soundFx.playTrash();
                              setQueue((prev) => prev.filter((q) => q.id !== item.id));
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Kaldır"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Settings & Target Formats (1 Col) */}
          <div className="space-y-4">
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  {activeCategory === 'audio' ? 'Hedef Ses Formatı' : 'Hedef Görsel Formatı'}
                </h3>
              </div>

              {/* Audio Format Selection */}
              {activeCategory === 'audio' && (
                <div className="space-y-2.5">
                  {audioFormats.map((fmt) => {
                    const isSelected = audioTargetFormat === fmt.id;
                    return (
                      <div
                        key={fmt.id}
                        onClick={() => {
                          soundFx.playPop();
                          setAudioTargetFormat(fmt.id);
                          setQueue((prev) =>
                            prev.map((q) =>
                              q.category === 'audio' ? { ...q, targetFormat: fmt.id } : q
                            )
                          );
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                            : isDarkMode
                            ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {fmt.label}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {fmt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {fmt.desc}
                        </p>
                      </div>
                    );
                  })}

                  {/* Audio Bitrate Setting */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Ses Kalitesi / Bit Hızı: {audioBitrate / 1000} kbps
                    </label>
                    <select
                      value={audioBitrate}
                      onChange={(e) => setAudioBitrate(Number(e.target.value))}
                      className={`w-full p-2 rounded-xl text-xs border outline-none font-semibold ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value={64000}>64 kbps (Düşük Boyut / Ses Kaydı)</option>
                      <option value={96000}>96 kbps (Dengeli Mobil)</option>
                      <option value={128000}>128 kbps (Standart Müzik Kalitesi)</option>
                      <option value={192000}>192 kbps (Yüksek Kalite Hi-Fi)</option>
                      <option value={320000}>320 kbps (Maksimum Stüdyo Kalitesi)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Image Format Selection */}
              {activeCategory === 'image' && (
                <div className="space-y-2.5">
                  {imageFormats.map((fmt) => {
                    const isSelected = imageTargetFormat === fmt.id;
                    return (
                      <div
                        key={fmt.id}
                        onClick={() => {
                          soundFx.playPop();
                          setImageTargetFormat(fmt.id);
                          setQueue((prev) =>
                            prev.map((q) =>
                              q.category === 'image' ? { ...q, targetFormat: fmt.id } : q
                            )
                          );
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                            : isDarkMode
                            ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {fmt.label}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {fmt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {fmt.desc}
                        </p>
                      </div>
                    );
                  })}

                  {/* Image Quality Slider */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <span>Görsel Kalitesi</span>
                      <span className="font-mono text-blue-500">%{Math.round(imageQuality * 100)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={imageQuality}
                      onChange={(e) => setImageQuality(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Image Max Width */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Maksimum Genişlik (Yeniden Boyutlandır)
                    </label>
                    <select
                      value={imageMaxWidth}
                      onChange={(e) => setImageMaxWidth(Number(e.target.value))}
                      className={`w-full p-2 rounded-xl text-xs border outline-none font-semibold ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value={0}>Orijinal Boyutu Koru</option>
                      <option value={3840}>4K Ultra HD (3840 px)</option>
                      <option value={1920}>Full HD (1920 px)</option>
                      <option value={1280}>HD Ready (1280 px)</option>
                      <option value={800}>Web Banner (800 px)</option>
                      <option value={400}>Avatar / Küçük Resim (400 px)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Privacy & Engine Badge */}
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-[11px]">
                <p className="font-bold text-slate-900 dark:text-white">Tamamen Çevrimdışı & Güvenli</p>
                <p className="text-slate-500 dark:text-slate-400">
                  Dosyalarınız hiçbir sunucuya yüklenmez; tüm çözme ve kodlama WebAudio & Canvas motorlarıyla yerel olarak çalışır.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DATA & DOCUMENT CONVERTER VIEW */}
      {activeCategory === 'data' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Area */}
          <div
            className={`p-5 rounded-2xl border space-y-3 flex flex-col ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Giriş Verisi (JSON / Markdown / Metin)
              </span>
              <button
                onClick={() => {
                  setDataInput('{\n  "status": "success",\n  "count": 42,\n  "company": "screlia labs"\n}');
                  soundFx.playPop();
                }}
                className="text-[11px] text-blue-500 hover:underline cursor-pointer"
              >
                Örnek Yükle
              </button>
            </div>

            <textarea
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              placeholder="JSON veya dönüştürmek istediğiniz metni buraya yapıştırın..."
              rows={12}
              className={`w-full flex-1 p-3 rounded-xl font-mono text-xs border outline-none resize-y ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
              }`}
            />

            {dataError && (
              <p className="text-xs text-red-500 font-medium">{dataError}</p>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Hedef Biçim:</span>
                <select
                  value={dataTargetFormat}
                  onChange={(e) => setDataTargetFormat(e.target.value as DataTargetFormat)}
                  className={`p-1.5 rounded-lg text-xs font-bold border outline-none ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="yaml">YAML (.yaml)</option>
                  <option value="csv">CSV (.csv Tablo)</option>
                  <option value="xml">XML (.xml)</option>
                  <option value="html">HTML (.html)</option>
                  <option value="base64">Base64 Encode</option>
                </select>
              </div>

              <button
                onClick={handleConvertData}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Dönüştür</span>
              </button>
            </div>
          </div>

          {/* Output Area */}
          <div
            className={`p-5 rounded-2xl border space-y-3 flex flex-col ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Dönüştürülen Çıktı ({dataTargetFormat.toUpperCase()})
              </span>
              {dataOutput && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(dataOutput);
                      setCopied(true);
                      soundFx.playSuccessChime();
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-500 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const blob = new Blob([dataOutput], { type: 'text/plain;charset=utf-8' });
                      triggerDownload(blob, `donusturulen_veri.${dataTargetFormat}`);
                      soundFx.playSuccessChime();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>İndir</span>
                  </button>
                </div>
              )}
            </div>

            <textarea
              readOnly
              value={dataOutput || 'Dönüştürme sonucunu görmek için soldaki butona tıklayın...'}
              rows={12}
              className={`w-full flex-1 p-3 rounded-xl font-mono text-xs border outline-none resize-y ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-emerald-400'
                  : 'bg-slate-50 border-slate-200 text-emerald-700'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
