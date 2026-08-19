/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * szip Media & File Format Converter Engine (by screlia labs)
 * 100% Client-Side In-Browser Media & Document Conversion
 */

export type AudioTargetFormat = 'opus' | 'wav' | 'ogg' | 'webm' | 'mp3';
export type ImageTargetFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'bmp' | 'ico';
export type DataTargetFormat = 'yaml' | 'json' | 'csv' | 'xml' | 'html' | 'base64';

export interface AudioConversionOptions {
  bitrate?: number; // in bps, e.g. 128000
  sampleRate?: number; // e.g. 44100, 48000
  channels?: 1 | 2;
  normalize?: boolean;
}

export interface ImageConversionOptions {
  quality?: number; // 0.1 - 1.0
  maxWidth?: number;
  maxHeight?: number;
  width?: number;
  height?: number;
  preserveAspect?: boolean;
  backgroundColor?: string;
}

export interface ConversionResult {
  blob: Blob;
  fileName: string;
  originalSize: number;
  convertedSize: number;
  savingsPercent: number;
  details?: {
    duration?: number;
    dimensions?: { width: number; height: number };
    channels?: number;
    format: string;
  };
}

/**
 * Encodes an AudioBuffer into standard WAV PCM 16-bit
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      // Clamp sample between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Converts Audio File (MP3, WAV, OGG, AAC, M4A, FLAC, etc.) to target format
 */
export async function convertAudioFile(
  file: File | Blob,
  fileName: string,
  targetFormat: AudioTargetFormat,
  options: AudioConversionOptions = {}
): Promise<ConversionResult> {
  const originalSize = file.size;
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const arrayBuffer = await file.arrayBuffer();

  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const duration = audioBuffer.duration;

    if (targetFormat === 'wav') {
      const wavBlob = audioBufferToWav(audioBuffer);
      const outName = `${baseName}.wav`;
      const convertedSize = wavBlob.size;
      const savings = originalSize > 0 ? Math.round(((originalSize - convertedSize) / originalSize) * 100) : 0;

      return {
        blob: wavBlob,
        fileName: outName,
        originalSize,
        convertedSize,
        savingsPercent: savings,
        details: {
          duration,
          channels: audioBuffer.numberOfChannels,
          format: 'WAV (PCM 16-bit)',
        },
      };
    }

    // For OPUS, WEBM, OGG, MP3 -> encode via MediaStream & MediaRecorder (Native Opus encoder in modern browsers)
    const mimeCandidates = [
      targetFormat === 'opus' ? 'audio/webm;codecs=opus' : '',
      targetFormat === 'opus' ? 'audio/ogg;codecs=opus' : '',
      targetFormat === 'ogg' ? 'audio/ogg;codecs=opus' : '',
      targetFormat === 'ogg' ? 'audio/ogg' : '',
      targetFormat === 'webm' ? 'audio/webm;codecs=opus' : '',
      'audio/webm',
      'audio/ogg',
    ].filter(Boolean);

    let chosenMime = mimeCandidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || 'audio/webm';
    let fileExt = targetFormat === 'opus' ? '.opus' : targetFormat === 'ogg' ? '.ogg' : targetFormat === 'webm' ? '.webm' : '.webm';

    // Set up offline-like playback through destination for recording
    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;

    const streamDest = audioCtx.createMediaStreamDestination();
    sourceNode.connect(streamDest);

    const bitrate = options.bitrate || 128000;
    const mediaRecorder = new MediaRecorder(streamDest.stream, {
      mimeType: chosenMime,
      audioBitsPerSecond: bitrate,
    });

    const chunks: Blob[] = [];
    const recordPromise = new Promise<Blob>((resolve, reject) => {
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      mediaRecorder.onerror = (err) => reject(err);
      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: chosenMime });
        resolve(finalBlob);
      };
    });

    mediaRecorder.start(100);
    sourceNode.start(0);

    // Stop after audio buffer duration (plus slight buffer)
    await new Promise<void>((resolve) => {
      sourceNode.onended = () => {
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          resolve();
        }, 150);
      };
    });

    const resultBlob = await recordPromise;
    const outName = `${baseName}${fileExt}`;
    const convertedSize = resultBlob.size;
    const savings = originalSize > 0 ? Math.round(((originalSize - convertedSize) / originalSize) * 100) : 0;

    return {
      blob: resultBlob,
      fileName: outName,
      originalSize,
      convertedSize,
      savingsPercent: savings,
      details: {
        duration,
        channels: audioBuffer.numberOfChannels,
        format: `${targetFormat.toUpperCase()} (Opus VBR)`,
      },
    };
  } finally {
    audioCtx.close().catch(() => {});
  }
}

/**
 * Converts Image File (PNG, JPEG, WEBP, AVIF, BMP, GIF, SVG, etc.) to target format
 */
export async function convertImageFile(
  file: File | Blob,
  fileName: string,
  targetFormat: ImageTargetFormat,
  options: ImageConversionOptions = {}
): Promise<ConversionResult> {
  const originalSize = file.size;
  const baseName = fileName.replace(/\.[^/.]+$/, '');

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Görsel dosyası yüklenemedi veya desteklenmeyen biçim.'));
    img.src = objectUrl;
  });

  URL.revokeObjectURL(objectUrl);

  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  if (options.width && options.height) {
    targetWidth = options.width;
    targetHeight = options.height;
  } else if (options.maxWidth && targetWidth > options.maxWidth) {
    const ratio = options.maxWidth / targetWidth;
    targetWidth = options.maxWidth;
    targetHeight = Math.round(targetHeight * ratio);
  } else if (options.maxHeight && targetHeight > options.maxHeight) {
    const ratio = options.maxHeight / targetHeight;
    targetHeight = options.maxHeight;
    targetWidth = Math.round(targetWidth * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D render bağlamı oluşturulamadı.');
  }

  // Handle transparency if converting to non-transparent format like JPEG
  if (targetFormat === 'jpeg' || targetFormat === 'bmp') {
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  let mimeType = 'image/png';
  let ext = '.png';
  const quality = options.quality !== undefined ? options.quality : 0.92;

  switch (targetFormat) {
    case 'jpeg':
      mimeType = 'image/jpeg';
      ext = '.jpg';
      break;
    case 'webp':
      mimeType = 'image/webp';
      ext = '.webp';
      break;
    case 'avif':
      mimeType = 'image/avif';
      ext = '.avif';
      break;
    case 'bmp':
      mimeType = 'image/bmp';
      ext = '.bmp';
      break;
    case 'ico':
      mimeType = 'image/x-icon';
      ext = '.ico';
      break;
    case 'png':
    default:
      mimeType = 'image/png';
      ext = '.png';
      break;
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error(`${targetFormat.toUpperCase()} formatına dönüştürme başarısız oldu.`));
      },
      mimeType,
      quality
    );
  });

  const outName = `${baseName}${ext}`;
  const convertedSize = blob.size;
  const savings = originalSize > 0 ? Math.round(((originalSize - convertedSize) / originalSize) * 100) : 0;

  return {
    blob,
    fileName: outName,
    originalSize,
    convertedSize,
    savingsPercent: savings,
    details: {
      dimensions: { width: targetWidth, height: targetHeight },
      format: targetFormat.toUpperCase(),
    },
  };
}

/**
 * Converts structured Data / Documents
 */
export function convertTextDocument(
  content: string,
  fromFormat: string,
  toFormat: DataTargetFormat
): { output: string; mimeType: string; ext: string } {
  const trimmed = content.trim();

  // JSON parsing
  if (toFormat === 'yaml') {
    try {
      const obj = JSON.parse(trimmed);
      const yamlStr = jsonToYaml(obj);
      return { output: yamlStr, mimeType: 'text/yaml', ext: '.yaml' };
    } catch {
      throw new Error('Geçerli bir JSON metni girilmedi.');
    }
  }

  if (toFormat === 'csv') {
    try {
      const obj = JSON.parse(trimmed);
      const csvStr = jsonToCsv(obj);
      return { output: csvStr, mimeType: 'text/csv', ext: '.csv' };
    } catch {
      throw new Error('CSV için JSON bir dizi nesne içermelidir (örn: [{"a":1}, {"a":2}]).');
    }
  }

  if (toFormat === 'xml') {
    try {
      const obj = JSON.parse(trimmed);
      const xmlStr = jsonToXml(obj);
      return { output: xmlStr, mimeType: 'application/xml', ext: '.xml' };
    } catch {
      throw new Error('Geçerli bir JSON metni girilmedi.');
    }
  }

  if (toFormat === 'base64') {
    const b64 = btoa(unescape(encodeURIComponent(content)));
    return { output: b64, mimeType: 'text/plain', ext: '.b64.txt' };
  }

  if (toFormat === 'html') {
    // Basic markdown to html
    const html = markdownToHtml(content);
    return { output: html, mimeType: 'text/html', ext: '.html' };
  }

  return { output: content, mimeType: 'text/plain', ext: '.txt' };
}

/**
 * Simple JSON to YAML converter
 */
function jsonToYaml(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null) return 'null';
  if (typeof obj === 'boolean' || typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(':') || obj.includes('"')) {
      return JSON.stringify(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj
      .map((item) => `${pad}- ${jsonToYaml(item, indent + 1).trimStart()}`)
      .join('\n');
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>);
    if (keys.length === 0) return '{}';
    return keys
      .map((key) => {
        const val = (obj as Record<string, unknown>)[key];
        if (typeof val === 'object' && val !== null) {
          return `${pad}${key}:\n${jsonToYaml(val, indent + 1)}`;
        }
        return `${pad}${key}: ${jsonToYaml(val, indent + 1)}`;
      })
      .join('\n');
  }

  return String(obj);
}

/**
 * Simple JSON array to CSV converter
 */
function jsonToCsv(obj: unknown): string {
  const items = Array.isArray(obj) ? obj : [obj];
  if (items.length === 0) return '';
  const headers = Array.from(
    new Set(
      items.flatMap((it) => (typeof it === 'object' && it !== null ? Object.keys(it) : []))
    )
  );

  const headerRow = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',');
  const rows = items.map((it) => {
    if (typeof it !== 'object' || it === null) return `"${String(it)}"`;
    return headers
      .map((h) => {
        const val = (it as Record<string, unknown>)[h];
        if (val === undefined || val === null) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headerRow, ...rows].join('\n');
}

/**
 * Simple JSON to XML converter
 */
function jsonToXml(obj: unknown, rootTag = 'root'): string {
  function toXml(val: unknown, tag: string): string {
    if (val === null || val === undefined) return `<${tag}/>`;
    if (Array.isArray(val)) {
      return val.map((item) => toXml(item, tag)).join('');
    }
    if (typeof val === 'object') {
      const inner = Object.entries(val as Record<string, unknown>)
        .map(([k, v]) => toXml(v, k))
        .join('');
      return `<${tag}>${inner}</${tag}>`;
    }
    const escaped = String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<${tag}>${escaped}</${tag}>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${toXml(obj, rootTag)}`;
}

/**
 * Lightweight Markdown to HTML
 */
function markdownToHtml(md: string): string {
  let html = md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br/>');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Converted Document</title><style>body{font-family:system-ui,sans-serif;line-height:1.6;padding:2rem;max-width:800px;margin:auto;color:#1e293b;background:#f8fafc;}pre{background:#0f172a;color:#f8fafc;padding:1rem;border-radius:8px;overflow-x:auto;}code{font-family:monospace;background:#e2e8f0;padding:2px 4px;border-radius:4px;}</style></head><body><p>${html}</p></body></html>`;
}
