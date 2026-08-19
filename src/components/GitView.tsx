import React, { useState, useEffect } from 'react';
import {
  GitBranch as GitBranchIcon,
  GitCommit as GitCommitIcon,
  GitPullRequest,
  Plus,
  Minus,
  Check,
  RotateCcw,
  FileCode2,
  FilePlus,
  Trash2,
  Download,
  FolderGit2,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  User,
  Mail,
  ChevronRight,
  FileText,
  Copy,
  Archive,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import { FileItem, GitBranch, GitCommit, GitStatusItem } from '../types';
import {
  computeGitStatus,
  generateGitHash,
  GITIGNORE_PRESETS,
  loadGitState,
  saveGitState,
} from '../utils/gitEngine';
import { computeLineDiff } from '../utils/diffUtils';
import { soundFx } from '../utils/audio';
import { triggerDownload } from '../utils/zipEngine';

interface Props {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  isDarkMode: boolean;
  onOpenInNpp?: (file: FileItem) => void;
  onRecordHistory?: (title: string, origSize: number, procSize: number, format: string) => void;
}

export const GitView: React.FC<Props> = ({
  files,
  setFiles,
  isDarkMode,
  onOpenInNpp,
  onRecordHistory,
}) => {
  // Load persistent git state
  const [gitState, setGitState] = useState(() => loadGitState());
  const [activeSubTab, setActiveSubTab] = useState<'diff' | 'history' | 'gitignore' | 'stash'>('diff');

  // Selected status file for diff
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Commit form
  const [commitMessage, setCommitMessage] = useState('');
  const [authorName, setAuthorName] = useState(gitState.authorName || 'szip Geliştirici');
  const [authorEmail, setAuthorEmail] = useState(gitState.authorEmail || 'developer@szip.local');

  // New branch modal
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // .gitignore content
  const [gitignoreContent, setGitignoreContent] = useState(() => {
    const existing = files.find((f) => f.name === '.gitignore');
    if (existing && typeof existing.content === 'string') return existing.content;
    return GITIGNORE_PRESETS.general.content;
  });

  // Stash message
  const [stashMessage, setStashMessage] = useState('');

  // Save git state whenever it changes
  useEffect(() => {
    saveGitState(gitState);
  }, [gitState]);

  // Compute live git status
  const statusItems = computeGitStatus(files, gitState.headSnapshot, gitState.stagedPaths);

  const stagedItems = statusItems.filter((s) => s.staged);
  const unstagedItems = statusItems.filter((s) => !s.staged);

  // Auto select first file if none selected
  useEffect(() => {
    if (!selectedPath && statusItems.length > 0) {
      setSelectedPath(statusItems[0].path);
    }
  }, [statusItems, selectedPath]);

  // Selected file for diff
  const selectedStatusItem = statusItems.find((s) => s.path === selectedPath) || statusItems[0];

  // Stage single file
  const handleStageFile = (path: string) => {
    soundFx.playClick();
    setGitState((prev) => ({
      ...prev,
      stagedPaths: Array.from(new Set([...prev.stagedPaths, path])),
    }));
  };

  // Unstage single file
  const handleUnstageFile = (path: string) => {
    soundFx.playClick();
    setGitState((prev) => ({
      ...prev,
      stagedPaths: prev.stagedPaths.filter((p) => p !== path),
    }));
  };

  // Stage all
  const handleStageAll = () => {
    soundFx.playPop();
    const allPaths = statusItems.map((s) => s.path);
    setGitState((prev) => ({
      ...prev,
      stagedPaths: Array.from(new Set([...prev.stagedPaths, ...allPaths])),
    }));
  };

  // Unstage all
  const handleUnstageAll = () => {
    soundFx.playClick();
    setGitState((prev) => ({
      ...prev,
      stagedPaths: [],
    }));
  };

  // Commit Staged Files
  const handleCreateCommit = () => {
    if (!commitMessage.trim()) {
      alert('Lütfen bir commit mesajı yazın.');
      return;
    }
    if (stagedItems.length === 0) {
      alert('Commit için önce dosyaları sahneye (Stage) ekleyin.');
      return;
    }

    soundFx.playSuccessChime();
    const { hash, shortHash } = generateGitHash();

    // Create file snapshot
    const snapshot = files.map((f) => ({
      path: f.path,
      content: typeof f.content === 'string' ? f.content : new TextDecoder().decode(f.content as Uint8Array),
      size: f.size || 0,
    }));

    const totalAdditions = stagedItems.reduce((acc, s) => acc + s.additions, 0);
    const totalDeletions = stagedItems.reduce((acc, s) => acc + s.deletions, 0);

    const newCommit: GitCommit = {
      hash,
      shortHash,
      author: authorName,
      email: authorEmail,
      date: Date.now(),
      message: commitMessage.trim(),
      branch: gitState.currentBranch,
      filesChanged: stagedItems.length,
      additions: totalAdditions,
      deletions: totalDeletions,
      files: stagedItems.map((s) => s.path),
      snapshot,
    };

    setGitState((prev) => ({
      ...prev,
      commits: [newCommit, ...prev.commits],
      stagedPaths: [],
      headSnapshot: snapshot,
      authorName,
      authorEmail,
      branches: prev.branches.map((b) =>
        b.name === prev.currentBranch ? { ...b, commitHash: shortHash } : b
      ),
    }));

    setCommitMessage('');

    if (onRecordHistory) {
      onRecordHistory(`git commit: ${shortHash}`, snapshot.length, 0, 'git');
    }
  };

  // Create Branch
  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;
    const cleanName = newBranchName.trim().replace(/\s+/g, '-').toLowerCase();
    soundFx.playPop();

    const currentHeadCommit = gitState.commits[0]?.shortHash || 'init';
    const newBranch: GitBranch = {
      name: cleanName,
      isCurrent: true,
      commitHash: currentHeadCommit,
    };

    setGitState((prev) => ({
      ...prev,
      currentBranch: cleanName,
      branches: [...prev.branches.map((b) => ({ ...b, isCurrent: false })), newBranch],
    }));

    setNewBranchName('');
    setShowNewBranchModal(false);
  };

  // Switch Branch
  const handleSwitchBranch = (branchName: string) => {
    soundFx.playClick();
    setGitState((prev) => ({
      ...prev,
      currentBranch: branchName,
      branches: prev.branches.map((b) => ({
        ...b,
        isCurrent: b.name === branchName,
      })),
    }));
  };

  // Revert / Checkout Commit Snapshot
  const handleCheckoutCommit = (commit: GitCommit) => {
    if (
      !confirm(
        `"${commit.message}" (${commit.shortHash}) commit anlık görüntüsüne dönmek istiyor musunuz? Mevcut çalışma alanınız bu sürüme güncellenecektir.`
      )
    ) {
      return;
    }
    soundFx.playSuccessChime();

    const restoredFiles: FileItem[] = commit.snapshot.map((s) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: s.path.split('/').pop() || s.path,
      path: s.path,
      size: s.size,
      type: 'text/plain',
      lastModified: commit.date,
      content: s.content,
    }));

    setFiles(restoredFiles);
    setGitState((prev) => ({
      ...prev,
      headSnapshot: commit.snapshot,
      stagedPaths: [],
    }));
  };

  // Save Stash
  const handleSaveStash = () => {
    if (statusItems.length === 0) {
      alert('Saklanacak herhangi bir değişiklik bulunmuyor.');
      return;
    }
    soundFx.playPop();

    const newStash: { id: string; message: string; date: number; branch: string; files: { path: string; content: string }[] } = {
      id: Math.random().toString(36).substring(2, 9),
      message: stashMessage.trim() || `WIP on ${gitState.currentBranch}: ${new Date().toLocaleTimeString()}`,
      date: Date.now(),
      branch: gitState.currentBranch,
      files: files.map((f) => ({
        path: f.path,
        content: typeof f.content === 'string' ? f.content : new TextDecoder().decode(f.content as Uint8Array),
      })),
    };

    setGitState((prev) => ({
      ...prev,
      stashes: [newStash, ...prev.stashes],
      stagedPaths: [],
    }));

    setStashMessage('');
  };

  // Save .gitignore to workspace
  const handleSaveGitignore = () => {
    soundFx.playSuccessChime();
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.name === '.gitignore');
      const item: FileItem = {
        id: idx >= 0 ? prev[idx].id : Math.random().toString(36).substring(2, 9),
        name: '.gitignore',
        path: '.gitignore',
        size: new TextEncoder().encode(gitignoreContent).byteLength,
        type: 'text/plain',
        lastModified: Date.now(),
        content: gitignoreContent,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
    alert('.gitignore dosyası başarıyla çalışma alanına kaydedildi.');
  };

  // Compute diff chunks for the selected item
  const diffResult = selectedStatusItem
    ? computeLineDiff(selectedStatusItem.oldContent || '', selectedStatusItem.newContent || '')
    : null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* Git Top Bar */}
      <div
        className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>Git Versiyon Kontrolü</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  HEAD
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Yerel commit motoru, dallanma ve visual diff
              </div>
            </div>
          </div>

          {/* Branch Selector */}
          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-700/50 pl-3">
            <GitBranchIcon className="w-3.5 h-3.5 text-blue-500" />
            <select
              value={gitState.currentBranch}
              onChange={(e) => handleSwitchBranch(e.target.value)}
              className={`p-1.5 rounded-lg border text-xs font-mono font-bold outline-hidden ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              {gitState.branches.map((b) => (
                <option key={b.name} value={b.name}>
                  🌿 {b.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowNewBranchModal(true)}
              title="Yeni Dal Oluştur"
              className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Sub Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              soundFx.playClick();
              setActiveSubTab('diff');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'diff'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>Diff & Değişiklikler ({statusItems.length})</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveSubTab('history');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Commit Ağacı ({gitState.commits.length})</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveSubTab('gitignore');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'gitignore'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>.gitignore</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveSubTab('stash');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'stash'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Stash ({gitState.stashes.length})</span>
          </button>
        </div>
      </div>

      {/* Main Git Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Stage, Unstage & Commit Box */}
        <div
          className={`w-80 border-r flex flex-col shrink-0 overflow-hidden ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Staged Section */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                Hazırlanan Değişiklikler (Staged)
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                {stagedItems.length}
              </span>
            </div>
            {stagedItems.length > 0 && (
              <button
                onClick={handleUnstageAll}
                title="Tümünü Sahneden Çıkar"
                className="text-[11px] text-slate-400 hover:text-amber-400 font-medium flex items-center gap-1"
              >
                <Minus className="w-3 h-3" />
                <span>Tümünü Bırak</span>
              </button>
            )}
          </div>

          {/* Staged Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[220px]">
            {stagedItems.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                Sahneye eklenmiş dosya yok.
              </div>
            ) : (
              stagedItems.map((item) => (
                <div
                  key={item.path}
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedPath(item.path);
                  }}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                    selectedPath === item.path
                      ? 'border-blue-500 bg-blue-500/10 text-white font-medium'
                      : isDarkMode
                      ? 'border-slate-800 hover:bg-slate-800/60 text-slate-300'
                      : 'border-slate-200 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">{item.path}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-emerald-400">+{item.additions}</span>
                    <span className="text-[10px] font-mono text-red-400">-{item.deletions}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnstageFile(item.path);
                      }}
                      title="Sahneden Çıkar"
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Unstaged Section */}
          <div className="p-3 border-t border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Değişiklikler (Unstaged)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                {unstagedItems.length}
              </span>
            </div>
            {unstagedItems.length > 0 && (
              <button
                onClick={handleStageAll}
                title="Tümünü Sahneye Ekle"
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Tümünü Ekle</span>
              </button>
            )}
          </div>

          {/* Unstaged Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {unstagedItems.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                Tüm değişiklikler güncel veya sahnelendi.
              </div>
            ) : (
              unstagedItems.map((item) => (
                <div
                  key={item.path}
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedPath(item.path);
                  }}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                    selectedPath === item.path
                      ? 'border-blue-500 bg-blue-500/10 text-white font-medium'
                      : isDarkMode
                      ? 'border-slate-800 hover:bg-slate-800/60 text-slate-300'
                      : 'border-slate-200 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        item.status === 'added' || item.status === 'untracked'
                          ? 'bg-blue-500'
                          : item.status === 'deleted'
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span className="truncate">{item.path}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStageFile(item.path);
                      }}
                      title="Sahneye Ekle"
                      className="p-1 hover:bg-blue-600 rounded text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Commit Box Form */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 space-y-2">
            <textarea
              rows={3}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit mesajı yazın (örn: feat: yeni arşiv formatları eklendi)..."
              className="w-full p-2 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-100 placeholder-slate-500 outline-hidden resize-none focus:border-blue-500 font-sans"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateCommit}
                disabled={stagedItems.length === 0 || !commitMessage.trim()}
                className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                  stagedItems.length > 0 && commitMessage.trim()
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-98'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <GitCommitIcon className="w-3.5 h-3.5" />
                <span>Commit Oluştur ({stagedItems.length} Dosya)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Area: Diff Viewer, Commit History, .gitignore, Stash */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/40">
          {activeSubTab === 'diff' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Diff Header */}
              <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-mono font-bold text-white">
                    {selectedStatusItem ? selectedStatusItem.path : 'Dosya Seçilmedi'}
                  </span>
                  {selectedStatusItem && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {selectedStatusItem.status}
                    </span>
                  )}
                </div>

                {selectedStatusItem && onOpenInNpp && (
                  <button
                    onClick={() => {
                      const f = files.find((item) => item.path === selectedStatusItem.path);
                      if (f) onOpenInNpp(f);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    <span>NPP'de Aç</span>
                  </button>
                )}
              </div>

              {/* Diff Code Area */}
              <div className="flex-1 overflow-auto p-4 font-mono text-xs">
                {diffResult ? (
                  <div className="space-y-4">
                    {diffResult.chunks.map((chunk, cIdx) => (
                      <div
                        key={cIdx}
                        className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden"
                      >
                        <div className="px-3 py-1.5 bg-slate-800/80 text-slate-400 text-[11px] font-mono border-b border-slate-800">
                          {chunk.header}
                        </div>
                        <div className="divide-y divide-slate-800/40">
                          {chunk.lines.map((line, lIdx) => (
                            <div
                              key={lIdx}
                              className={`flex items-start py-0.5 px-3 leading-relaxed ${
                                line.type === 'add'
                                  ? 'bg-emerald-950/40 text-emerald-300'
                                  : line.type === 'del'
                                  ? 'bg-red-950/40 text-red-300'
                                  : 'text-slate-300'
                              }`}
                            >
                              <div className="w-8 shrink-0 text-slate-600 select-none text-[10px]">
                                {line.oldLineNumber || ''}
                              </div>
                              <div className="w-8 shrink-0 text-slate-600 select-none text-[10px]">
                                {line.newLineNumber || ''}
                              </div>
                              <div className="w-6 shrink-0 text-center select-none font-bold">
                                {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                              </div>
                              <div className="flex-1 whitespace-pre-wrap break-all font-mono">
                                {line.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    İncelemek için sol menüden değiştirilen bir dosya seçin.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'history' && (
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Commit Geçmişi & Zaman Çizelgesi ({gitState.commits.length} Commit)
                </h3>
              </div>

              {gitState.commits.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500 text-xs">
                  Henüz commit oluşturulmadı. Sol panelden değişikliklerinizi sahneye ekleyip ilk commitinizi yapabilirsiniz.
                </div>
              ) : (
                gitState.commits.map((commit, idx) => (
                  <div
                    key={commit.hash}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start justify-between gap-4 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                        <GitCommitIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{commit.message}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-blue-400 border border-slate-700">
                            {commit.shortHash}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            🌿 {commit.branch}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {commit.author}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(commit.date).toLocaleString()}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-400">+{commit.additions}</span>
                          <span className="text-red-400">-{commit.deletions}</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {commit.files.map((f) => (
                            <span
                              key={f}
                              className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[10px] font-mono text-slate-300 border border-slate-700/50"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCheckoutCommit(commit)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Bu Sürüme Dön</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeSubTab === 'gitignore' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">.gitignore Şablon & Yapılandırma</h3>
                  <p className="text-xs text-slate-400">
                    Git ve arşiv motorunun görmezden geleceği dosya ve dizin kuralları
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      const preset = GITIGNORE_PRESETS[e.target.value];
                      if (preset) {
                        setGitignoreContent(preset.content);
                        soundFx.playPop();
                      }
                    }}
                    className="p-2 rounded-lg border border-slate-700 bg-slate-900 text-xs text-slate-200 outline-hidden font-medium"
                  >
                    <option value="">📋 Hazır Şablon Seç...</option>
                    <option value="web_node">🌐 Node.js & React/Vite</option>
                    <option value="python">🐍 Python / Django</option>
                    <option value="rust">🦀 Rust (Cargo)</option>
                    <option value="general">🧹 Genel OS Çöpleri</option>
                  </select>

                  <button
                    onClick={handleSaveGitignore}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>Çalışma Alanına Kaydet</span>
                  </button>
                </div>
              </div>

              <textarea
                value={gitignoreContent}
                onChange={(e) => setGitignoreContent(e.target.value)}
                className="flex-1 w-full p-4 rounded-xl border border-slate-800 bg-slate-900 font-mono text-xs text-slate-200 outline-hidden focus:border-blue-500 resize-none leading-relaxed"
              />
            </div>
          )}

          {activeSubTab === 'stash' && (
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Değişiklikleri Stash'e Al (Geçici Saklama)
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={stashMessage}
                    onChange={(e) => setStashMessage(e.target.value)}
                    placeholder="Stash mesajı (opsiyonel)..."
                    className="flex-1 p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-white outline-hidden focus:border-blue-500"
                  />
                  <button
                    onClick={handleSaveStash}
                    className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0"
                  >
                    Stash Kaydet
                  </button>
                </div>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-6">
                Kayıtlı Stash Listesi ({gitState.stashes.length})
              </h3>

              {gitState.stashes.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  Henüz kaydedilmiş bir stash bulunmuyor.
                </div>
              ) : (
                gitState.stashes.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{st.message}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Dal: {st.branch} • {new Date(st.date).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        soundFx.playPop();
                        setGitState((prev) => ({
                          ...prev,
                          stashes: prev.stashes.filter((s) => s.id !== st.id),
                        }));
                      }}
                      className="px-3 py-1 rounded-lg border border-red-900/60 text-red-400 hover:bg-red-950/40 text-xs"
                    >
                      Sil
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Branch Modal */}
      {showNewBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GitBranchIcon className="w-4 h-4 text-blue-500" />
              Yeni Git Dalı (Branch) Oluştur
            </h3>
            <input
              type="text"
              autoFocus
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Örn: feature/yeni-sikistirma-algoritmasi"
              className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-white outline-hidden focus:border-blue-500 font-mono"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNewBranchModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                İptal
              </button>
              <button
                onClick={handleCreateBranch}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Dal Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
