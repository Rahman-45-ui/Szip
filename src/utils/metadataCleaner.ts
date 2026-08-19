import { FileItem, FileMetadataReport, MetadataTagInfo } from '../types';
import { isMacJunkFile } from './formatters';

/**
 * Real Binary & Canvas Metadata Engine for PNG, JPEG, SVG, Code, and System Files
 * Extracts actual byte-level EXIF, GPS, PNG chunks, and IPTC/XMP tags,
 * and performs genuine byte-level stripping & canvas sanitization.
 */

// Helper to convert ArrayBuffer/Uint8Array or string into Uint8Array
async function getFileBytes(file: FileItem): Promise<Uint8Array | null> {
  if (file.file) {
    const buffer = await file.file.arrayBuffer();
    return new Uint8Array(buffer);
  }
  if (file.content instanceof Uint8Array) {
    return file.content;
  }
  if (file.content instanceof ArrayBuffer) {
    return new Uint8Array(file.content);
  }
  if (typeof file.content === 'string') {
    return new TextEncoder().encode(file.content);
  }
  return null;
}

// Parse TIFF header and IFD tags from an Exif buffer
function parseTiffExif(
  data: Uint8Array,
  tiffOffset: number
): { tags: MetadataTagInfo[]; hasGps: boolean; hasExif: boolean } {
  const tags: MetadataTagInfo[] = [];
  let hasGps = false;
  let hasExif = false;

  if (tiffOffset + 8 > data.length) return { tags, hasGps, hasExif };

  const isLittleEndian = data[tiffOffset] === 0x49 && data[tiffOffset + 1] === 0x49; // 'II'
  const isBigEndian = data[tiffOffset] === 0x4d && data[tiffOffset + 1] === 0x4d; // 'MM'
  if (!isLittleEndian && !isBigEndian) return { tags, hasGps, hasExif };

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const getUint16 = (offset: number) => view.getUint16(tiffOffset + offset, isLittleEndian);
  const getUint32 = (offset: number) => view.getUint32(tiffOffset + offset, isLittleEndian);

  const magic = getUint16(2);
  if (magic !== 42) return { tags, hasGps, hasExif };

  const ifd0Offset = getUint32(4);
  if (ifd0Offset < 8 || tiffOffset + ifd0Offset >= data.length) return { tags, hasGps, hasExif };

  let exifOffset = 0;
  let gpsOffset = 0;

  // Read IFD0
  const readIFD = (offset: number, isGpsIFD = false) => {
    if (tiffOffset + offset + 2 > data.length) return;
    const numEntries = getUint16(offset);

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = offset + 2 + i * 12;
      if (tiffOffset + entryOffset + 12 > data.length) break;

      const tag = getUint16(entryOffset);
      const type = getUint16(entryOffset + 2);
      const count = getUint32(entryOffset + 4);
      const valOffset = entryOffset + 8;

      let strVal = '';
      if (type === 2) {
        // ASCII String
        const dataOffset = count > 4 ? getUint32(valOffset) : valOffset;
        if (tiffOffset + dataOffset + count <= data.length) {
          const chars: string[] = [];
          for (let c = 0; c < count; c++) {
            const charCode = data[tiffOffset + dataOffset + c];
            if (charCode === 0) break;
            chars.push(String.fromCharCode(charCode));
          }
          strVal = chars.join('').trim();
        }
      }

      if (tag === 0x010f && strVal) {
        // Make
        hasExif = true;
        tags.push({ tag: 'Kamera Üreticisi (Make)', value: strVal, category: 'exif', risk: 'medium' });
      } else if (tag === 0x0110 && strVal) {
        // Model
        hasExif = true;
        tags.push({ tag: 'Cihaz / Kamera Modeli (Model)', value: strVal, category: 'exif', risk: 'medium' });
      } else if (tag === 0x0131 && strVal) {
        // Software
        hasExif = true;
        tags.push({ tag: 'Yazılım / İşletim Sistemi', value: strVal, category: 'author', risk: 'low' });
      } else if (tag === 0x0132 && strVal) {
        // DateTime
        tags.push({ tag: 'Orijinal Çekim Tarihi', value: strVal, category: 'timestamp', risk: 'medium' });
      } else if (tag === 0x8769) {
        // Exif SubIFD
        exifOffset = getUint32(valOffset);
      } else if (tag === 0x8825) {
        // GPS Info IFD
        gpsOffset = getUint32(valOffset);
        hasGps = true;
      }

      if (isGpsIFD) {
        hasGps = true;
        if (tag === 0x0002) {
          // GPS Latitude
          tags.push({ tag: 'GPS Enlem Koordinatı (Latitude)', value: 'Enlem Verisi Tespit Edildi', category: 'gps', risk: 'high' });
        } else if (tag === 0x0004) {
          // GPS Longitude
          tags.push({ tag: 'GPS Boylam Koordinatı (Longitude)', value: 'Boylam Verisi Tespit Edildi', category: 'gps', risk: 'high' });
        } else if (tag === 0x0006) {
          // GPS Altitude
          tags.push({ tag: 'GPS Rakım Bilgisi (Altitude)', value: 'Rakım Verisi Tespit Edildi', category: 'gps', risk: 'high' });
        }
      }
    }
  };

  try {
    readIFD(ifd0Offset);
    if (exifOffset > 0) readIFD(exifOffset);
    if (gpsOffset > 0) readIFD(gpsOffset, true);
  } catch {
    // Ignore malformed sub-IFDs
  }

  return { tags, hasGps, hasExif };
}

// Parse Real JPEG Markers (APP1 Exif, APP2 ICC, APP13 IPTC, COM)
function parseJpegMetadata(data: Uint8Array): { tags: MetadataTagInfo[]; hasGps: boolean; hasExif: boolean } {
  let tags: MetadataTagInfo[] = [];
  let hasGps = false;
  let hasExif = false;

  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    return { tags, hasGps, hasExif };
  }

  let offset = 2;
  while (offset < data.length - 4) {
    if (data[offset] !== 0xff) break;
    const marker = data[offset + 1];
    if (marker === 0xda || marker === 0xd9) break; // SOS or EOI

    const length = (data[offset + 2] << 8) | data[offset + 3];
    if (length < 2 || offset + 2 + length > data.length) break;

    // APP1: Exif / XMP
    if (marker === 0xe1) {
      const isExif =
        data[offset + 4] === 0x45 && // 'E'
        data[offset + 5] === 0x78 && // 'x'
        data[offset + 6] === 0x69 && // 'i'
        data[offset + 7] === 0x66 && // 'f'
        data[offset + 8] === 0x00 &&
        data[offset + 9] === 0x00;

      if (isExif) {
        hasExif = true;
        const res = parseTiffExif(data, offset + 10);
        tags = [...tags, ...res.tags];
        if (res.hasGps) hasGps = true;
        if (res.hasExif) hasExif = true;
      } else {
        // Could be XMP
        tags.push({
          tag: 'Adobe XMP Meta Bloğu (APP1)',
          value: 'XMP Verisi & Düzenleme Geçmişi',
          category: 'author',
          risk: 'medium',
        });
      }
    } else if (marker === 0xe2) {
      // APP2: ICC Color Profile
      tags.push({
        tag: 'ICC Renk Profili & Cihaz Gamı (APP2)',
        value: 'Gömülü Renk Profili',
        category: 'exif',
        risk: 'low',
      });
    } else if (marker === 0xed) {
      // APP13: Photoshop IPTC
      tags.push({
        tag: 'Photoshop IPTC / Telif Bloğu (APP13)',
        value: 'Fotoğrafçı & Telif Bilgisi',
        category: 'author',
        risk: 'medium',
      });
    } else if (marker === 0xfe) {
      // COM: Comment
      tags.push({
        tag: 'JPEG Yorum Bloğu (COM)',
        value: 'Gömülü Açıklama',
        category: 'author',
        risk: 'low',
      });
    }

    offset += 2 + length;
  }

  return { tags, hasGps, hasExif };
}

// Parse Real PNG Chunks (IHDR, tEXt, zTXt, iTXt, eXIf, pHYs, tIME)
function parsePngMetadata(data: Uint8Array): { tags: MetadataTagInfo[]; hasGps: boolean; hasExif: boolean } {
  let tags: MetadataTagInfo[] = [];
  let hasGps = false;
  let hasExif = false;

  // Check PNG Signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    data.length < 8 ||
    data[0] !== 0x89 ||
    data[1] !== 0x50 ||
    data[2] !== 0x4e ||
    data[3] !== 0x47 ||
    data[4] !== 0x0d ||
    data[5] !== 0x0a ||
    data[6] !== 0x1a ||
    data[7] !== 0x0a
  ) {
    return { tags, hasGps, hasExif };
  }

  let offset = 8;
  while (offset + 8 <= data.length) {
    const length =
      (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    const chunkType = String.fromCharCode(
      data[offset + 4],
      data[offset + 5],
      data[offset + 6],
      data[offset + 7]
    );

    if (offset + 12 + length > data.length) break;

    const chunkDataOffset = offset + 8;

    if (chunkType === 'eXIf') {
      hasExif = true;
      const res = parseTiffExif(data, chunkDataOffset);
      tags = [...tags, ...res.tags];
      if (res.hasGps) hasGps = true;
      if (res.hasExif) hasExif = true;
    } else if (chunkType === 'tEXt' || chunkType === 'iTXt' || chunkType === 'zTXt') {
      // Parse Latin-1 / UTF-8 keyword
      const nullIdx = data.indexOf(0, chunkDataOffset);
      let keyword = 'Metin Bloğu';
      let textValue = '';
      if (nullIdx !== -1 && nullIdx < chunkDataOffset + length) {
        const keyBytes = data.slice(chunkDataOffset, nullIdx);
        keyword = new TextDecoder('latin1').decode(keyBytes);
        const valBytes = data.slice(nullIdx + 1, chunkDataOffset + length);
        textValue = new TextDecoder('latin1').decode(valBytes).substring(0, 80);
      }

      tags.push({
        tag: `PNG ${chunkType} (${keyword})`,
        value: textValue ? `${keyword}: ${textValue}` : `Metadata: ${keyword}`,
        category: 'author',
        risk: keyword.toLowerCase().includes('author') || keyword.toLowerCase().includes('copyright') ? 'medium' : 'low',
      });
    } else if (chunkType === 'pHYs') {
      tags.push({
        tag: 'PNG pHYs (Fiziksel Piksel Boyutu & DPI)',
        value: 'Yazdırma / DPI Çözünürlük İmzası',
        category: 'exif',
        risk: 'low',
      });
    } else if (chunkType === 'tIME') {
      const year = (data[chunkDataOffset] << 8) | data[chunkDataOffset + 1];
      const month = data[chunkDataOffset + 2];
      const day = data[chunkDataOffset + 3];
      const hour = data[chunkDataOffset + 4];
      const min = data[chunkDataOffset + 5];
      const sec = data[chunkDataOffset + 6];
      tags.push({
        tag: 'PNG tIME (Orijinal Kayıt Zamanı)',
        value: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour}:${min}:${sec}`,
        category: 'timestamp',
        risk: 'medium',
      });
    }

    if (chunkType === 'IEND') break;

    offset += 12 + length; // 4 (len) + 4 (type) + length + 4 (crc)
  }

  return { tags, hasGps, hasExif };
}

/**
 * Real File Metadata Inspector
 */
export function analyzeFileMetadata(file: FileItem): FileMetadataReport {
  const tagsFound: MetadataTagInfo[] = [];
  let hasGps = false;
  let hasExif = false;
  const isJunk = file.isMacJunk || isMacJunkFile(file.name) || isMacJunkFile(file.path);

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const dateStr = new Date(file.lastModified).toLocaleString();

  // 1. Timestamp Inspection
  tagsFound.push({
    tag: 'Son Değişiklik Zaman Damgası',
    value: dateStr,
    category: 'timestamp',
    risk: 'low',
  });

  // 2. User Path Leak Inspection
  if (
    file.path.includes('/Users/') ||
    file.path.includes('C:\\Users\\') ||
    file.path.includes('/home/')
  ) {
    tagsFound.push({
      tag: 'Kullanıcı Profil Yolu (User Path Leak)',
      value: file.path,
      category: 'security',
      risk: 'high',
    });
  }

  // 3. OS Junk Artifacts
  if (isJunk) {
    tagsFound.push({
      tag: 'İşletim Sistemi İzi (OS Junk)',
      value: file.name.includes('.DS_Store')
        ? 'macOS Finder Klasör Düzeni (.DS_Store)'
        : file.name.includes('Thumbs.db')
        ? 'Windows Küçük Resim Veritabanı (Thumbs.db)'
        : file.name.includes('__MACOSX')
        ? 'macOS Resource Fork & Genişletilmiş Nitelikler'
        : file.name.includes('desktop.ini')
        ? 'Windows Klasör İkon Ayarları (desktop.ini)'
        : 'Gizli Sistem Geçmiş Verisi',
      category: 'system',
      risk: 'medium',
    });
  }

  // 4. Binary Inspection for PNG & JPEG
  if (file.content instanceof Uint8Array || file.content instanceof ArrayBuffer) {
    const bytes = file.content instanceof Uint8Array ? file.content : new Uint8Array(file.content);
    if (ext === 'jpg' || ext === 'jpeg') {
      const res = parseJpegMetadata(bytes);
      tagsFound.push(...res.tags);
      if (res.hasGps) hasGps = true;
      if (res.hasExif) hasExif = true;
    } else if (ext === 'png') {
      const res = parsePngMetadata(bytes);
      tagsFound.push(...res.tags);
      if (res.hasGps) hasGps = true;
      if (res.hasExif) hasExif = true;
    }
  }

  // 5. SVG XML Metadata
  if (ext === 'svg' && typeof file.content === 'string') {
    if (
      file.content.includes('<metadata>') ||
      file.content.includes('sodipodi:') ||
      file.content.includes('inkscape:') ||
      file.content.includes('adobe:')
    ) {
      tagsFound.push({
        tag: 'Vektör Editör İmzası (SVG Metadata / Inkscape / Illustrator)',
        value: 'Gömülü Vektör Düzenleme Meta Bloğu',
        category: 'author',
        risk: 'medium',
      });
    }
  }

  // 6. PDF & Office Docs
  if (['pdf', 'docx', 'xlsx', 'pptx'].includes(ext)) {
    tagsFound.push({
      tag: 'Belge Özellikleri & Meta Verisi',
      value: 'Yazar, Program ve Revizyon Nitelikleri',
      category: 'author',
      risk: 'medium',
    });
  }

  // 7. Source code author comments
  if (['ts', 'js', 'json', 'html', 'py', 'go', 'rs', 'sh', 'md'].includes(ext)) {
    if (
      typeof file.content === 'string' &&
      (file.content.includes('@author') ||
        file.content.includes('Copyright') ||
        file.content.includes('/Users/'))
    ) {
      tagsFound.push({
        tag: 'Geliştirici İmzası & Yazar Yorumu',
        value: 'Kod İçi Telif & Geliştirici İmzası',
        category: 'author',
        risk: 'low',
      });
    }
  }

  return {
    fileId: file.id,
    fileName: file.name,
    filePath: file.path,
    fileSize: file.size,
    mimeType: file.type || `application/${ext}`,
    tagsFound,
    hasGps,
    hasExif,
    hasOsJunk: isJunk,
    sanitized: !!file.metadataCleaned,
    originalDate: dateStr,
  };
}

/**
 * Pure Binary PNG Sanitizer: Strips all non-essential chunks (eXIf, tEXt, zTXt, iTXt, pHYs, tIME)
 */
export function sanitizePngBinary(data: Uint8Array): Uint8Array {
  if (data.length < 8) return data;
  // Verify PNG header
  if (
    data[0] !== 0x89 ||
    data[1] !== 0x50 ||
    data[2] !== 0x4e ||
    data[3] !== 0x47 ||
    data[4] !== 0x0d ||
    data[5] !== 0x0a ||
    data[6] !== 0x1a ||
    data[7] !== 0x0a
  ) {
    return data;
  }

  // Chunks to strictly keep: IHDR, PLTE, IDAT, IEND, tRNS
  const safeChunks = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'acTL', 'fcTL', 'fdAT']);
  const chunksToKeep: Uint8Array[] = [];
  let totalLength = 8; // Start with 8-byte PNG header

  let offset = 8;
  while (offset + 8 <= data.length) {
    const length =
      (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    const chunkType = String.fromCharCode(
      data[offset + 4],
      data[offset + 5],
      data[offset + 6],
      data[offset + 7]
    );

    const fullChunkLength = 12 + length;
    if (offset + fullChunkLength > data.length) break;

    if (safeChunks.has(chunkType)) {
      const chunkBytes = data.slice(offset, offset + fullChunkLength);
      chunksToKeep.push(chunkBytes);
      totalLength += fullChunkLength;
    }

    if (chunkType === 'IEND') break;
    offset += fullChunkLength;
  }

  const cleanPng = new Uint8Array(totalLength);
  cleanPng.set(data.slice(0, 8), 0);
  let writeOffset = 8;
  for (const chunk of chunksToKeep) {
    cleanPng.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }

  return cleanPng;
}

/**
 * Pure Binary JPEG Sanitizer: Strips APP1 (Exif/XMP), APP2 (ICC), APP13 (Photoshop), COM
 */
export function sanitizeJpegBinary(data: Uint8Array): Uint8Array {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return data;

  const keptSegments: Uint8Array[] = [];
  let totalLength = 2; // Start with SOI (0xFFD8)

  let offset = 2;
  while (offset < data.length - 1) {
    if (data[offset] !== 0xff) {
      // Scan data stream to end
      const remaining = data.slice(offset);
      keptSegments.push(remaining);
      totalLength += remaining.length;
      break;
    }

    const marker = data[offset + 1];
    if (marker === 0xda || marker === 0xd9) {
      // Start of Scan (SOS) or End of Image (EOI)
      const remaining = data.slice(offset);
      keptSegments.push(remaining);
      totalLength += remaining.length;
      break;
    }

    if (offset + 4 > data.length) break;
    const length = (data[offset + 2] << 8) | data[offset + 3];
    const fullSegLength = 2 + length;

    if (offset + fullSegLength > data.length) break;

    // Drop APP1 (0xE1), APP2 (0xE2), APP13 (0xED), COM (0xFE)
    const isMetadataMarker =
      marker === 0xe1 || marker === 0xe2 || marker === 0xed || marker === 0xfe;

    if (!isMetadataMarker) {
      const seg = data.slice(offset, offset + fullSegLength);
      keptSegments.push(seg);
      totalLength += seg.length;
    }

    offset += fullSegLength;
  }

  const cleanJpeg = new Uint8Array(totalLength);
  cleanJpeg.set([0xff, 0xd8], 0);
  let writeOffset = 2;
  for (const seg of keptSegments) {
    cleanJpeg.set(seg, writeOffset);
    writeOffset += seg.length;
  }

  return cleanJpeg;
}

/**
 * Canvas Image Sanitizer (Re-encodes image through clean HTML5 Canvas)
 */
export async function sanitizeImageViaCanvas(
  fileOrBlob: Blob | File,
  mimeType: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fileOrBlob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(fileOrBlob);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const outMime = mimeType === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(fileOrBlob);
          }
        },
        outMime,
        0.95
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(fileOrBlob);
    };
    img.src = url;
  });
}

/**
 * Sanitize a FileItem with byte-level cleaning and normalized timestamps
 */
export async function sanitizeFileItem(item: FileItem): Promise<FileItem> {
  const isJunk = item.isMacJunk || isMacJunkFile(item.name) || isMacJunkFile(item.path);
  if (isJunk) {
    return item;
  }

  const ext = item.name.split('.').pop()?.toLowerCase() || '';
  let cleanContent = item.content;
  let cleanFile = item.file;

  // 1. PNG Sanitization
  if (ext === 'png') {
    const bytes = await getFileBytes(item);
    if (bytes) {
      const stripped = sanitizePngBinary(bytes);
      cleanContent = stripped;
      cleanFile = new File([stripped], item.name, { type: 'image/png' });
    }
  }

  // 2. JPEG Sanitization
  if (ext === 'jpg' || ext === 'jpeg') {
    const bytes = await getFileBytes(item);
    if (bytes) {
      const stripped = sanitizeJpegBinary(bytes);
      cleanContent = stripped;
      cleanFile = new File([stripped], item.name, { type: 'image/jpeg' });
    }
  }

  // 3. SVG Sanitization
  if (ext === 'svg' && typeof item.content === 'string') {
    let svg = item.content;
    svg = svg.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    svg = svg.replace(/<!--[\s\S]*?-->/g, '');
    svg = svg.replace(/\s(sodipodi|inkscape|adobe):[a-z0-9_-]+="[^"]*"/gi, '');
    cleanContent = svg;
  }

  // 4. Text & Code Sanitization
  if (typeof item.content === 'string') {
    let text = item.content;
    text = text.replace(/^\/\*\*[\s\S]*?@author[\s\S]*?\*\/\n?/gi, '');
    text = text.replace(/^(\/\/|#|\/\*)\s*Copyright[\s\S]*?(\*\/|\n)/gim, '');
    cleanContent = text;
  }

  // Deterministic normalized timestamp (1980-01-01T00:00:00Z)
  return {
    ...item,
    file: cleanFile,
    content: cleanContent,
    lastModified: new Date('1980-01-01T00:00:00Z').getTime(),
    metadataCleaned: true,
  };
}
