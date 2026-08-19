import JSZip from 'jszip';
import { ArchiveEntry, CompressionSettings, FileItem, LoadedArchive } from '../types';
import { isMacJunkFile } from './formatters';
import { detectFormatFromFilename, getFormatMeta } from './supportedFormats';

export async function createArchiveZip(
  files: FileItem[],
  settings: CompressionSettings,
  onProgress?: (percent: number, currentFile: string) => void
): Promise<{ blob: Blob; fileName: string; originalSize: number; compressedSize: number; ratio: number }> {
  const zip = new JSZip();
  let totalOriginalBytes = 0;

  // Filter junk if requested
  const effectiveFiles = files.filter((f) => {
    if (settings.excludeMacJunk && (f.isMacJunk || isMacJunkFile(f.name) || isMacJunkFile(f.path))) {
      return false;
    }
    return true;
  });

  // Add files to zip
  for (let i = 0; i < effectiveFiles.length; i++) {
    const item = effectiveFiles[i];
    const path = item.path || item.name;
    
    if (onProgress) {
      const progress = Math.round(((i + 1) / effectiveFiles.length) * 50);
      onProgress(progress, item.name);
    }

    if (item.file) {
      totalOriginalBytes += item.file.size;
      zip.file(path, item.file);
    } else if (typeof item.content === 'string') {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(item.content);
      totalOriginalBytes += encoded.byteLength;
      zip.file(path, item.content);
    } else if (item.content instanceof ArrayBuffer || item.content instanceof Uint8Array) {
      totalOriginalBytes += item.content.byteLength;
      zip.file(path, item.content);
    } else {
      totalOriginalBytes += item.size || 0;
      zip.file(path, item.name);
    }
  }

  // If format is TAR or Store level, compression is STORE
  const compressionType = settings.level === 0 || settings.format === 'tar' || settings.format === 'iso' ? 'STORE' : 'DEFLATE';
  const compressionLevel = settings.level === 0 ? undefined : settings.level;

  const formatMeta = getFormatMeta(settings.format);
  const commentText = settings.comment 
    ? `${settings.comment}\n[szip Pro - Format: ${formatMeta.name} - Level: ${settings.level}]`
    : `[szip Pro - ${formatMeta.name}]`;

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      mimeType: formatMeta.mimeType,
      compression: compressionType,
      compressionOptions: {
        level: compressionLevel as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
      },
      comment: commentText,
    },
    (metadata) => {
      if (onProgress) {
        const totalPct = 50 + Math.round(metadata.percent / 2);
        onProgress(totalPct, metadata.currentFile || 'Arşiv derleniyor...');
      }
    }
  );

  const compressedSize = blob.size;
  const ratio = totalOriginalBytes > 0 
    ? Math.max(0, Math.round(((totalOriginalBytes - compressedSize) / totalOriginalBytes) * 100))
    : 0;

  const fileName = `${settings.archiveName}.${settings.format}`;

  return {
    blob,
    fileName,
    originalSize: totalOriginalBytes,
    compressedSize,
    ratio,
  };
}

export async function readArchiveFile(file: File | Blob, customFilename?: string): Promise<LoadedArchive> {
  const zip = new JSZip();
  const filename = customFilename || (file instanceof File ? file.name : 'archive.zip');
  const detectedFormat = detectFormatFromFilename(filename);

  let loaded: JSZip;
  try {
    loaded = await zip.loadAsync(file);
  } catch {
    // If it's a binary or unsupported header, create a simulated package view
    return {
      fileName: filename,
      fileSize: file.size,
      detectedFormat,
      totalUncompressedSize: file.size,
      filesCount: 1,
      foldersCount: 0,
      entries: [
        {
          id: 'single-1',
          name: filename,
          path: filename,
          dir: false,
          uncompressedSize: file.size,
          compressedSize: file.size,
          date: new Date(),
          type: filename.split('.').pop() || 'bin',
          asyncContent: async () => file,
        },
      ],
      comment: `szip ile açıldı (${detectedFormat.toUpperCase()} Formatı)`,
      compressionRatio: 0,
      rawBlob: file instanceof Blob ? file : new Blob([file]),
    };
  }

  const entries: ArchiveEntry[] = [];
  let totalUncompressed = 0;
  let filesCount = 0;
  let foldersCount = 0;

  const zipEntries = Object.values(loaded.files);

  for (const zipObj of zipEntries) {
    const isDir = zipObj.dir || zipObj.name.endsWith('/');
    if (isDir) {
      foldersCount++;
    } else {
      filesCount++;
    }

    const rawData = (zipObj as unknown as { _data?: { uncompressedSize?: number; compressedSize?: number; crc32?: number } })._data;
    const uncompressedSize = rawData?.uncompressedSize || 0;
    const compressedSize = rawData?.compressedSize || uncompressedSize;
    totalUncompressed += uncompressedSize;

    const entry: ArchiveEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name: zipObj.name.split('/').filter(Boolean).pop() || zipObj.name,
      path: zipObj.name,
      dir: isDir,
      uncompressedSize,
      compressedSize,
      date: zipObj.date || new Date(),
      comment: zipObj.comment,
      crc32: rawData?.crc32,
      type: isDir ? 'folder' : zipObj.name.split('.').pop()?.toLowerCase() || 'unknown',
      asyncContent: async () => {
        if (isDir) return '';
        // Extract text if text/code candidate or blob
        const isTextCandidate = /\.(txt|md|json|ts|tsx|js|jsx|html|css|py|csv|xml|yaml|yml|svg|sh|env|ini|conf|log|sql)$/i.test(zipObj.name);
        if (isTextCandidate) {
          return await zipObj.async('string');
        }
        return await zipObj.async('blob');
      },
    };

    entries.push(entry);
  }

  const fileSize = file.size;
  const ratio = totalUncompressed > 0
    ? Math.max(0, Math.round(((totalUncompressed - fileSize) / totalUncompressed) * 100))
    : 0;

  return {
    fileName: filename,
    fileSize,
    detectedFormat,
    totalUncompressedSize: totalUncompressed || fileSize,
    filesCount: filesCount || 1,
    foldersCount,
    entries,
    comment: (loaded as unknown as { comment?: string }).comment || `szip Engine [${detectedFormat.toUpperCase()}]`,
    compressionRatio: ratio,
    rawBlob: file instanceof Blob ? file : new Blob([file]),
  };
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
