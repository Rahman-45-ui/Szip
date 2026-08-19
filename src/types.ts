export type ArchiveFormat =
  | 'zip'
  | '7z'
  | 'tar'
  | 'tgz'
  | 'gz'
  | 'bz2'
  | 'xz'
  | 'zst'
  | 'lz4'
  | 'rar'
  | 'cbz'
  | 'cbr'
  | 'cbt'
  | 'cb7'
  | 'dmg'
  | 'iso'
  | 'wim'
  | 'jar'
  | 'apk'
  | 'ipa'
  | 'deb'
  | 'rpm'
  | 'cab'
  | 'appx';

export interface FormatMeta {
  id: ArchiveFormat;
  name: string;
  ext: string;
  badge: string;
  category: 'Evrensel' | 'UNIX & DevOps' | 'Yüksek Sıkıştırma' | 'Disk & Sanallaştırma' | 'Medya & Çizgi Roman' | 'Paket & Dağıtım';
  description: string;
  algorithm: string;
  canCompress: boolean;
  canExtract: boolean;
  mimeType: string;
  popularUsage: string;
  defaultLevel: CompressionLevel;
  compressionSpeed: 'Ultra Hızlı' | 'Hızlı' | 'Dengeli' | 'Maksimum';
  ratioScore: 'Standart' | 'İyi' | 'Yüksek' | 'Maksimum';
}

export type CompressionLevel = 0 | 1 | 3 | 6 | 9; // 0=Store, 1=Fastest, 3=Fast, 6=Balanced, 9=Ultra

export type AppMode = 'normal' | 'studio';

export type ViewTab =
  | 'compress'
  | 'extract'
  | 'converter'
  | 'npp'
  | 'cleaner'
  | 'git'
  | 'batch'
  | 'formats'
  | 'history';

export type DisplayLayout = 'list' | 'grid' | 'column' | 'tree';

export type ThemeMode = 'dark' | 'light' | 'oled' | 'nord' | 'dracula' | 'monokai' | 'solarized' | 'synthwave';

export type AccentColor = 'blue' | 'purple' | 'emerald' | 'amber' | 'crimson' | 'cyan' | 'orange' | 'rose';

export type EditorFontFamily =
  | 'JetBrains Mono'
  | 'Fira Code'
  | 'Source Code Pro'
  | 'Roboto Mono'
  | 'Consolas'
  | 'Menlo'
  | 'Cascadia Code';

export type SoundTheme = 'subtle' | 'modern' | 'mechanical' | 'retro_mac' | 'off';

export interface CustomizationSettings {
  theme: ThemeMode;
  accent: AccentColor;
  fontFamily: EditorFontFamily;
  fontSize: number;
  uiDensity: 'compact' | 'comfortable' | 'spacious';
  soundTheme: SoundTheme;
  soundVolume: number;
  nppLineWrap: boolean;
  nppMiniMap: boolean;
  nppShowInvisibles: boolean;
  nppTabSize: number;
  doubleClickAction: 'npp' | 'quicklook' | 'download';
  autoExcludeJunk: boolean;
  autoExifClean: boolean;
}

export interface NppDocument {
  id: string;
  name: string;
  path: string;
  content: string;
  initialContent: string;
  language: string;
  isDirty: boolean;
  encoding: 'UTF-8' | 'UTF-16' | 'ASCII' | 'ANSI';
  lineEnding: 'CRLF' | 'LF';
  source: 'workspace' | 'archive' | 'custom';
  fileItemId?: string;
  archiveEntryId?: string;
}

export interface FolderNode {
  id: string;
  name: string;
  fullPath: string;
  subfolders: FolderNode[];
  fileIds: string[];
  isOpen: boolean;
  totalSize: number;
}

export interface MetadataTagInfo {
  tag: string;
  value: string;
  category: 'exif' | 'gps' | 'author' | 'system' | 'timestamp' | 'security';
  risk: 'high' | 'medium' | 'low';
}

export interface FileMetadataReport {
  fileId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  tagsFound: MetadataTagInfo[];
  hasGps: boolean;
  hasExif: boolean;
  hasOsJunk: boolean;
  sanitized: boolean;
  originalDate: string;
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  lastModified: number;
  file?: File;
  content?: string | ArrayBuffer | Uint8Array;
  isFolder?: boolean;
  isMacJunk?: boolean; // e.g. .DS_Store, __MACOSX
  metadataCleaned?: boolean;
}

export interface CompressionSettings {
  archiveName: string;
  format: ArchiveFormat;
  level: CompressionLevel;
  password?: string;
  excludeMacJunk: boolean;
  enableEncryption: boolean;
  splitVolume: boolean;
  volumeSizeMB: number;
  comment: string;
  solidArchive: boolean;
}

export interface ArchiveEntry {
  id: string;
  name: string;
  path: string;
  dir: boolean;
  uncompressedSize: number;
  compressedSize: number;
  date: Date;
  comment?: string;
  crc32?: number;
  type: string;
  asyncContent?: () => Promise<Blob | string | ArrayBuffer>;
}

export interface LoadedArchive {
  fileName: string;
  fileSize: number;
  detectedFormat?: ArchiveFormat;
  totalUncompressedSize: number;
  filesCount: number;
  foldersCount: number;
  entries: ArchiveEntry[];
  comment?: string;
  compressionRatio: number;
  rawBlob?: Blob;
}

export interface QuickLookFile {
  name: string;
  size: number;
  type: string;
  date: Date;
  textContent?: string;
  blobUrl?: string;
  isImage?: boolean;
  isText?: boolean;
  isAudio?: boolean;
  isPdf?: boolean;
  isCode?: boolean;
}

export interface HistoryItem {
  id: string;
  type: 'compress' | 'extract' | 'clean' | 'git_commit' | 'git_branch';
  title: string;
  timestamp: number;
  originalSize: number;
  processedSize: number;
  savingsRatio: number;
  format: string;
  fileCount: number;
  status: 'success' | 'warning' | 'error';
}

export interface PresetProfile {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  format: ArchiveFormat;
  level: CompressionLevel;
  excludeMacJunk: boolean;
  description: string;
  badge?: string;
}

// ---------------- Git Types ----------------
export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'staged' | 'unmodified';

export interface GitStatusItem {
  id: string;
  path: string;
  name: string;
  status: GitFileStatus;
  staged: boolean;
  additions: number;
  deletions: number;
  oldContent?: string;
  newContent?: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: number;
  message: string;
  branch: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  files: string[];
  snapshot: { path: string; content: string | Uint8Array; size: number }[];
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  commitHash: string;
  isProtected?: boolean;
}

export interface GitStashItem {
  id: string;
  message: string;
  date: number;
  branch: string;
  files: { path: string; content: string | Uint8Array }[];
}

export interface GitDiffLine {
  type: 'add' | 'del' | 'normal';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface GitDiffChunk {
  header: string;
  lines: GitDiffLine[];
}

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  danger?: boolean;
  separator?: boolean;
  action: () => void;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  title?: string;
  subtitle?: string;
  actions: ContextMenuAction[];
}
