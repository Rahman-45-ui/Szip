export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Az önce';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export function getFileCategory(filename: string): {
  category: 'code' | 'image' | 'doc' | 'archive' | 'audio' | 'video' | 'system' | 'other';
  color: string;
  ext: string;
} {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  if (filename === '.DS_Store' || filename.startsWith('__MACOSX') || filename.startsWith('._')) {
    return { category: 'system', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', ext: 'sys' };
  }

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'json':
    case 'html':
    case 'css':
    case 'py':
    case 'rs':
    case 'go':
    case 'swift':
    case 'c':
    case 'cpp':
      return { category: 'code', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', ext };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'ico':
    case 'bmp':
    case 'heic':
      return { category: 'image', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', ext };
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
    case 'md':
    case 'rtf':
    case 'xls':
    case 'xlsx':
    case 'csv':
      return { category: 'doc', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', ext };
    case 'zip':
    case 'tar':
    case 'gz':
    case '7z':
    case 'rar':
    case 'dmg':
    case 'pkg':
    case 'iso':
      return { category: 'archive', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', ext };
    case 'mp3':
    case 'wav':
    case 'm4a':
    case 'flac':
    case 'aac':
      return { category: 'audio', color: 'text-pink-500 bg-pink-500/10 border-pink-500/20', ext };
    case 'mp4':
    case 'mov':
    case 'mkv':
    case 'avi':
      return { category: 'video', color: 'text-red-500 bg-red-500/10 border-red-500/20', ext };
    default:
      return { category: 'other', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20', ext: ext || 'file' };
  }
}

export function isMacJunkFile(filename: string): boolean {
  const base = filename.split('/').pop() || filename;
  return (
    base === '.DS_Store' ||
    base === '.localized' ||
    base === 'Thumbs.db' ||
    base.startsWith('._') ||
    filename.includes('__MACOSX') ||
    filename.includes('.Spotlight-V100') ||
    filename.includes('.Trashes')
  );
}
