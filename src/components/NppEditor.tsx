import React, { useState, useRef, useEffect } from 'react';
import {
  FileCode2,
  Save,
  Download,
  Plus,
  X,
  Search,
  Replace,
  WrapText,
  Type,
  Code2,
  Sparkles,
  Undo2,
  Redo2,
  Copy,
  Scissors,
  Check,
  ChevronDown,
  FileText,
  FolderOpen,
  ArrowDownAZ,
  Maximize2,
  Minimize2,
  FilePlus,
  Braces,
  Hash,
  Terminal,
} from 'lucide-react';
import { FileItem, NppDocument } from '../types';
import { formatBytes } from '../utils/formatters';
import { soundFx } from '../utils/audio';
import { triggerDownload } from '../utils/zipEngine';

interface Props {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  isDarkMode: boolean;
  activeDocId?: string;
  onClose?: () => void;
}

const SAMPLE_SNIPPETS: Record<string, { label: string; code: string; lang: string }> = {
  html: {
    label: 'HTML5 Standart Şablon',
    lang: 'html',
    code: `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>szip Pro Studio</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <h1>Merhaba Dünya</h1>
    <p>szip NPP Editör ile oluşturuldu.</p>
  </div>
  <script src="main.js"></script>
</body>
</html>`,
  },
  json: {
    label: 'JSON Yapılandırma (package.json)',
    lang: 'json',
    code: `{
  "name": "szip-project",
  "version": "1.0.0",
  "description": "szip modern arşivleme ve dosya yönetim aracı",
  "main": "index.js",
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  },
  "keywords": ["archive", "zip", "7z", "compression"],
  "author": "szip Studio",
  "license": "Apache-2.0"
}`,
  },
  ts: {
    label: 'TypeScript Arayüz & Fonksiyon',
    lang: 'typescript',
    code: `export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'developer' | 'guest';
  createdAt: Date;
}

export function formatGreeting(user: UserProfile): string {
  return \`Hoş geldiniz, \${user.name} (\${user.role})!\`;
}`,
  },
  python: {
    label: 'Python 3 Script Şablonu',
    lang: 'python',
    code: `#!/usr/bin/env python3
import os
import sys
import json

def process_archive(file_path: str):
    print(f"[*] İşleniyor: {file_path}")
    if not os.path.exists(file_path):
        raise FileNotFoundError("Dosya bulunamadı!")
    print("[+] Arşiv başarıyla incelendi.")

if __name__ == "__main__":
    process_archive("arsiv.zip")
`,
  },
  docker: {
    label: 'Dockerfile Şablonu',
    lang: 'dockerfile',
    code: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
  },
  gitignore: {
    label: '.gitignore Standart Filtre',
    lang: 'plaintext',
    code: `# Bağımlılıklar
node_modules/
vendor/

# Derleme Çıktıları
dist/
build/
*.log

# İşletim Sistemi Çöpleri
.DS_Store
Thumbs.db
__MACOSX/
*.swp

# Gizli Ortam Değişkenleri
.env
.env.local`,
  },
};

export const NppEditor: React.FC<Props> = ({
  files,
  setFiles,
  isDarkMode,
  activeDocId,
}) => {
  // Documents in editor tabs
  const [documents, setDocuments] = useState<NppDocument[]>(() => {
    // Convert text files from filesToCompress into NppDocuments
    const docs: NppDocument[] = files
      .filter((f) => {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        return ['txt', 'md', 'json', 'ts', 'tsx', 'js', 'jsx', 'html', 'css', 'py', 'sh', 'env', 'xml', 'yaml', 'yml', 'sql', 'ini', 'conf', 'c', 'cpp', 'rs', 'go', 'php'].includes(ext);
      })
      .map((f) => {
        let textContent = '';
        if (typeof f.content === 'string') {
          textContent = f.content;
        } else if (f.content instanceof Uint8Array) {
          try {
            textContent = new TextDecoder().decode(f.content);
          } catch {
            textContent = '';
          }
        } else if (f.content instanceof ArrayBuffer) {
          try {
            textContent = new TextDecoder().decode(new Uint8Array(f.content));
          } catch {
            textContent = '';
          }
        }
        return {
          id: f.id,
          name: f.name,
          path: f.path,
          content: textContent,
          initialContent: textContent,
          language: detectLanguage(f.name),
          isDirty: false,
          encoding: 'UTF-8',
          lineEnding: 'LF',
          source: 'workspace',
          fileItemId: f.id,
        };
      });

    if (docs.length === 0) {
      // Default initial blank document
      docs.push({
        id: 'new-doc-1',
        name: 'yeni_belge.txt',
        path: 'yeni_belge.txt',
        content: '',
        initialContent: '',
        language: 'plaintext',
        isDirty: false,
        encoding: 'UTF-8',
        lineEnding: 'LF',
        source: 'custom',
      });
    }

    return docs;
  });

  const [currentDocId, setCurrentDocId] = useState<string>(
    activeDocId || (documents[0]?.id ?? 'new-doc-1')
  );

  // Editor Settings & Search
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1, selLen: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const currentDoc = documents.find((d) => d.id === currentDocId) || documents[0];

  function detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'json':
        return 'json';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'py':
        return 'python';
      case 'md':
        return 'markdown';
      case 'sh':
        return 'bash';
      case 'sql':
        return 'sql';
      case 'xml':
      case 'svg':
        return 'xml';
      case 'yaml':
      case 'yml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  }

  // Handle text edit
  const handleContentChange = (newContent: string) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id === currentDoc.id) {
          return {
            ...d,
            content: newContent,
            isDirty: newContent !== d.initialContent,
          };
        }
        return d;
      })
    );
  };

  // Sync cursor pos
  const handleCursorActivity = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const selStart = textareaRef.current.selectionStart;
    const selEnd = textareaRef.current.selectionEnd;
    const before = text.substring(0, selStart);
    const lines = before.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    setCursorPos({ line, col, selLen: Math.abs(selEnd - selStart) });
  };

  // Synchronize Line Number Scrolling
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Save to Workspace / Files
  const handleSaveDocument = () => {
    if (!currentDoc) return;
    soundFx.playSuccessChime();

    // Update or insert in filesToCompress
    setFiles((prev) => {
      const existingIdx = prev.findIndex((f) => f.id === currentDoc.fileItemId || f.name === currentDoc.name);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          content: currentDoc.content,
          size: new TextEncoder().encode(currentDoc.content).byteLength,
          lastModified: Date.now(),
        };
        return updated;
      } else {
        const newFileItem: FileItem = {
          id: currentDoc.id,
          name: currentDoc.name,
          path: currentDoc.path,
          size: new TextEncoder().encode(currentDoc.content).byteLength,
          type: 'text/plain',
          lastModified: Date.now(),
          content: currentDoc.content,
        };
        return [...prev, newFileItem];
      }
    });

    // Mark document as clean
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === currentDoc.id
          ? { ...d, initialContent: d.content, isDirty: false, fileItemId: d.fileItemId || d.id }
          : d
      )
    );

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2200);
  };

  // Export / Download current file
  const handleDownloadCurrentFile = () => {
    if (!currentDoc) return;
    soundFx.playClick();
    const blob = new Blob([currentDoc.content], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, currentDoc.name);
  };

  // Create new document tab
  const handleCreateNewDoc = () => {
    soundFx.playPop();
    const count = documents.length + 1;
    const newDoc: NppDocument = {
      id: `doc-${Date.now()}`,
      name: `belge_${count}.txt`,
      path: `belge_${count}.txt`,
      content: '',
      initialContent: '',
      language: 'plaintext',
      isDirty: false,
      encoding: 'UTF-8',
      lineEnding: 'LF',
      source: 'custom',
    };
    setDocuments((prev) => [...prev, newDoc]);
    setCurrentDocId(newDoc.id);
  };

  // Close tab
  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playClick();
    if (documents.length === 1) {
      handleCreateNewDoc();
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (currentDocId === id) {
      const remaining = documents.filter((d) => d.id !== id);
      if (remaining.length > 0) {
        setCurrentDocId(remaining[0].id);
      }
    }
  };

  // Insert Snippet
  const handleInsertSnippet = (key: string) => {
    const snip = SAMPLE_SNIPPETS[key];
    if (!snip) return;
    soundFx.playPop();
    handleContentChange(snip.code);
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === currentDoc.id
          ? { ...d, language: snip.lang, name: d.name.endsWith('.txt') ? `ornek_${key}.${key === 'html' ? 'html' : key === 'json' ? 'json' : key === 'ts' ? 'ts' : key === 'python' ? 'py' : 'txt'}` : d.name }
          : d
      )
    );
  };

  // Format / Prettify JSON
  const handleFormatJson = () => {
    if (!currentDoc) return;
    try {
      const parsed = JSON.parse(currentDoc.content);
      const formatted = JSON.stringify(parsed, null, 2);
      handleContentChange(formatted);
      soundFx.playClick();
    } catch {
      alert('Geçersiz JSON formatı! Lütfen sözdizimini kontrol edin.');
    }
  };

  // Transform Case
  const handleTransformCase = (mode: 'upper' | 'lower' | 'title') => {
    if (!currentDoc) return;
    soundFx.playClick();
    let res = currentDoc.content;
    if (mode === 'upper') res = res.toUpperCase();
    if (mode === 'lower') res = res.toLowerCase();
    if (mode === 'title') {
      res = res.replace(/\b\w/g, (c) => c.toUpperCase());
    }
    handleContentChange(res);
  };

  // Base64 Encode / Decode
  const handleBase64Transform = (encode: boolean) => {
    if (!currentDoc) return;
    soundFx.playClick();
    try {
      if (encode) {
        handleContentChange(btoa(unescape(encodeURIComponent(currentDoc.content))));
      } else {
        handleContentChange(decodeURIComponent(escape(atob(currentDoc.content))));
      }
    } catch (err) {
      alert('Base64 dönüştürme hatası: ' + (err as Error).message);
    }
  };

  // Sort Lines
  const handleSortLines = (asc: boolean = true) => {
    if (!currentDoc) return;
    soundFx.playClick();
    const lines = currentDoc.content.split('\n');
    lines.sort((a, b) => (asc ? a.localeCompare(b) : b.localeCompare(a)));
    handleContentChange(lines.join('\n'));
  };

  // Perform Search & Replace
  const handleReplaceAll = () => {
    if (!searchQuery || !currentDoc) return;
    soundFx.playClick();
    try {
      let reg: RegExp;
      if (isRegex) {
        reg = new RegExp(searchQuery, matchCase ? 'g' : 'gi');
      } else {
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        reg = new RegExp(escaped, matchCase ? 'g' : 'gi');
      }
      const updated = currentDoc.content.replace(reg, replaceQuery);
      handleContentChange(updated);
    } catch (err) {
      alert('Arama ifadesi hatası: ' + (err as Error).message);
    }
  };

  const linesCount = currentDoc ? currentDoc.content.split('\n').length : 1;
  const charsCount = currentDoc ? currentDoc.content.length : 0;
  const bytesSize = currentDoc ? new TextEncoder().encode(currentDoc.content).byteLength : 0;

  return (
    <div id="npp-editor-root" className="h-full flex flex-col overflow-hidden select-none">
      {/* 1. NPP Document Tabs Bar */}
      <div
        className={`flex items-center justify-between border-b px-2 overflow-x-auto ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {documents.map((doc) => {
            const isActive = doc.id === currentDocId;
            return (
              <div
                key={doc.id}
                onClick={() => {
                  soundFx.playClick();
                  setCurrentDocId(doc.id);
                }}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-t border-x text-xs font-mono cursor-pointer transition-all ${
                  isActive
                    ? isDarkMode
                      ? 'bg-slate-950 border-slate-700 text-blue-400 font-semibold shadow-xs'
                      : 'bg-white border-slate-300 text-blue-600 font-semibold shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-900/60 border-transparent text-slate-400 hover:bg-slate-800'
                    : 'bg-slate-200/60 border-transparent text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 opacity-80" />
                <span className="truncate max-w-[130px]">{doc.name}</span>
                {doc.isDirty && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" title="Değişiklikler kaydedilmedi" />
                )}
                <button
                  onClick={(e) => handleCloseTab(doc.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:bg-slate-500/20 p-0.5 rounded transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <button
            onClick={handleCreateNewDoc}
            title="Yeni Boş Belge (Ctrl+N)"
            className={`p-1.5 rounded-lg border text-xs flex items-center transition-colors ${
              isDarkMode
                ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Save Toast Notification */}
        {saveToast && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Kaydedildi</span>
          </div>
        )}
      </div>

      {/* 2. NPP Classic Multi-Tool Toolbar */}
      <div
        className={`px-3 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}
      >
        {/* Left Toolbar Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleSaveDocument}
            title="Değişiklikleri Kaydet & Arşive Ekle"
            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-98"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Kaydet</span>
          </button>

          <button
            onClick={handleDownloadCurrentFile}
            title="Dosyayı İndir"
            className={`p-1.5 rounded-lg border transition-colors ${
              isDarkMode
                ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-800 mx-1" />

          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Bul ve Değiştir (Ctrl+F)"
            className={`px-2 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
              showSearch
                ? 'bg-blue-500/10 border-blue-500 text-blue-500 font-semibold'
                : isDarkMode
                ? 'border-slate-800 hover:bg-slate-800'
                : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Bul/Değiştir</span>
          </button>

          {/* JSON Tools */}
          <button
            onClick={handleFormatJson}
            title="JSON Formatla / Prettify"
            className={`px-2 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
              isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Braces className="w-3.5 h-3.5 text-amber-500" />
            <span>JSON Düzenle</span>
          </button>

          {/* Case Conversion Dropdown / Buttons */}
          <div className="flex items-center gap-0.5 border rounded-lg overflow-hidden border-slate-200 dark:border-slate-800">
            <button
              onClick={() => handleTransformCase('upper')}
              title="TÜMÜNÜ BÜYÜK HARF YAP"
              className="px-1.5 py-1 text-[11px] font-mono hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              AA
            </button>
            <button
              onClick={() => handleTransformCase('lower')}
              title="tümünü küçük harf yap"
              className="px-1.5 py-1 text-[11px] font-mono hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              aa
            </button>
            <button
              onClick={() => handleTransformCase('title')}
              title="Başlık Düzeni"
              className="px-1.5 py-1 text-[11px] font-mono hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Aa
            </button>
          </div>

          {/* Sort Lines */}
          <button
            onClick={() => handleSortLines(true)}
            title="Satırları A-Z Sırala"
            className={`p-1.5 rounded-lg border transition-colors ${
              isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowDownAZ className="w-3.5 h-3.5 text-emerald-500" />
          </button>

          {/* Base64 Encode */}
          <button
            onClick={() => handleBase64Transform(true)}
            title="Base64 Metne Dönüştür"
            className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition-colors ${
              isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            B64
          </button>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-800 mx-1" />

          {/* Snippets / Templates */}
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleInsertSnippet(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className={`px-2 py-1 rounded-lg border text-[11px] outline-none ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="" disabled>
              + Kod Şablonu Ekle...
            </option>
            <option value="ts">TypeScript Modülü</option>
            <option value="json">package.json</option>
            <option value="html">HTML5 Standart</option>
            <option value="python">Python 3 Script</option>
            <option value="docker">Dockerfile</option>
            <option value="gitignore">.gitignore</option>
          </select>
        </div>

        {/* Right Toolbar: View Settings */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWordWrap(!wordWrap)}
            title={wordWrap ? 'Satır Kaydırma Açık' : 'Satır Kaydırma Kapalı'}
            className={`p-1.5 rounded-lg border transition-colors ${
              wordWrap
                ? 'bg-blue-500/10 border-blue-500 text-blue-500 font-semibold'
                : isDarkMode
                ? 'border-slate-800 hover:bg-slate-800'
                : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title="Satır Numaraları"
            className={`p-1.5 rounded-lg border transition-colors ${
              showLineNumbers
                ? 'bg-blue-500/10 border-blue-500 text-blue-500 font-semibold'
                : isDarkMode
                ? 'border-slate-800 hover:bg-slate-800'
                : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center border rounded-lg overflow-hidden border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setFontSize(Math.max(10, fontSize - 1))}
              className="px-2 py-0.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
            >
              -
            </button>
            <span className="px-1.5 text-[11px] font-mono">{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(22, fontSize + 1))}
              className="px-2 py-0.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 3. Search & Replace Slide Down Bar */}
      {showSearch && (
        <div
          className={`p-2.5 border-b flex flex-wrap items-center gap-2 text-xs animate-slide-down ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Aranacak metin..."
              className="bg-transparent outline-none text-xs w-36 lg:w-48 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1">
            <Replace className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Yeni metin..."
              className="bg-transparent outline-none text-xs w-36 lg:w-48 text-slate-900 dark:text-white"
            />
          </div>

          <button
            onClick={handleReplaceAll}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-2xs text-xs"
          >
            Tümünü Değiştir
          </button>

          <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-500">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="rounded"
            />
            <span>Büyük/Küçük Harf</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-500">
            <input
              type="checkbox"
              checked={isRegex}
              onChange={(e) => setIsRegex(e.target.checked)}
              className="rounded"
            />
            <span>Regex (.*)</span>
          </label>
        </div>
      )}

      {/* 4. Editor Surface (Gutter + Textarea) */}
      <div className="flex-1 flex overflow-hidden relative bg-white dark:bg-slate-950">
        {/* Line Numbers Gutter */}
        {showLineNumbers && (
          <div
            ref={lineNumbersRef}
            className={`w-12 py-3 select-none text-right pr-3 font-mono text-slate-400 dark:text-slate-600 border-r overflow-hidden ${
              isDarkMode ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}
            style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
          >
            {Array.from({ length: linesCount }, (_, i) => (
              <div
                key={i + 1}
                className={cursorPos.line === i + 1 ? 'text-blue-500 font-bold' : ''}
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={currentDoc?.content ?? ''}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyUp={handleCursorActivity}
          onClick={handleCursorActivity}
          onScroll={handleScroll}
          spellCheck={false}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: '1.6',
            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
          }}
          className={`flex-1 h-full p-3 font-mono outline-none resize-none bg-transparent ${
            isDarkMode ? 'text-slate-100 placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
          }`}
          placeholder="// Kodunuzu veya metninizi buraya yazın ya da bir arşiv dosyası açın..."
        />
      </div>

      {/* 5. NPP Bottom Status Bar */}
      <div
        className={`h-7 border-t px-4 flex items-center justify-between text-[11px] font-mono select-none ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-slate-900 dark:text-white">Satır:</span> {cursorPos.line}
            <span className="font-semibold text-slate-900 dark:text-white ml-2">Sütun:</span> {cursorPos.col}
            {cursorPos.selLen > 0 && <span className="text-blue-500 ml-2">({cursorPos.selLen} seçili)</span>}
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">
            {linesCount} Satır, {charsCount} Karakter ({formatBytes(bytesSize)})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-semibold text-[10px] text-blue-600 dark:text-blue-400 uppercase">
            {currentDoc?.language || 'plaintext'}
          </span>
          <span>{currentDoc?.encoding || 'UTF-8'}</span>
          <span>{currentDoc?.lineEnding || 'LF'}</span>
        </div>
      </div>
    </div>
  );
};
