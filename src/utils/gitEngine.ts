import { FileItem, GitBranch, GitCommit, GitStashItem, GitStatusItem } from '../types';
import { computeLineDiff } from './diffUtils';

const GIT_STORAGE_KEY = 'szip_git_repo_state_v1';

export interface GitRepoState {
  isInitialized: boolean;
  currentBranch: string;
  branches: GitBranch[];
  commits: GitCommit[];
  stashes: GitStashItem[];
  stagedPaths: string[];
  headSnapshot: { path: string; content: string; size: number }[];
  authorName: string;
  authorEmail: string;
}

const DEFAULT_GIT_STATE: GitRepoState = {
  isInitialized: true,
  currentBranch: 'main',
  branches: [
    { name: 'main', isCurrent: true, commitHash: 'c01a9df', isProtected: false },
    { name: 'feature/szip-core', isCurrent: false, commitHash: 'c01a9df', isProtected: false },
  ],
  commits: [],
  stashes: [],
  stagedPaths: [],
  headSnapshot: [],
  authorName: 'szip Geliştirici',
  authorEmail: 'developer@szip.local',
};

// Generate simulated SHA-1 hash
export function generateGitHash(): { hash: string; shortHash: string } {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return { hash, shortHash: hash.substring(0, 7) };
}

// Convert file content to string
export function getFileTextContent(file: FileItem): string {
  if (typeof file.content === 'string') return file.content;
  if (file.content instanceof Uint8Array) {
    try {
      return new TextDecoder().decode(file.content);
    } catch {
      return '[Binary data]';
    }
  }
  return '';
}

// Load git state from localStorage or default
export function loadGitState(): GitRepoState {
  try {
    const raw = localStorage.getItem(GIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_GIT_STATE, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load git state:', e);
  }
  return DEFAULT_GIT_STATE;
}

// Save git state to localStorage
export function saveGitState(state: GitRepoState) {
  try {
    localStorage.setItem(GIT_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save git state:', e);
  }
}

// Compute git status for current workspace files against HEAD snapshot
export function computeGitStatus(
  files: FileItem[],
  headSnapshot: { path: string; content: string; size: number }[],
  stagedPaths: string[]
): GitStatusItem[] {
  const statusList: GitStatusItem[] = [];
  const headMap = new Map<string, { path: string; content: string; size: number }>();
  headSnapshot.forEach((h) => headMap.set(h.path, h));

  const currentMap = new Map<string, FileItem>();
  files.forEach((f) => currentMap.set(f.path, f));

  // Check current files (added or modified)
  for (const file of files) {
    const staged = stagedPaths.includes(file.path);
    const headFile = headMap.get(file.path);
    const currentText = getFileTextContent(file);

    if (!headFile) {
      // Untracked or Newly Added
      const { additions, deletions } = computeLineDiff('', currentText);
      statusList.push({
        id: file.id,
        path: file.path,
        name: file.name,
        status: staged ? 'added' : 'untracked',
        staged,
        additions,
        deletions,
        oldContent: '',
        newContent: currentText,
      });
    } else {
      // Compare contents
      if (headFile.content !== currentText) {
        const { additions, deletions } = computeLineDiff(headFile.content, currentText);
        statusList.push({
          id: file.id,
          path: file.path,
          name: file.name,
          status: 'modified',
          staged,
          additions,
          deletions,
          oldContent: headFile.content,
          newContent: currentText,
        });
      }
    }
  }

  // Check deleted files (were in HEAD, but missing from current files)
  for (const [path, headFile] of headMap.entries()) {
    if (!currentMap.has(path)) {
      const staged = stagedPaths.includes(path);
      const { deletions } = computeLineDiff(headFile.content, '');
      statusList.push({
        id: `del-${path}`,
        path: path,
        name: path.split('/').pop() || path,
        status: 'deleted',
        staged,
        additions: 0,
        deletions,
        oldContent: headFile.content,
        newContent: '',
      });
    }
  }

  return statusList;
}

// Gitignore presets
export const GITIGNORE_PRESETS: Record<string, { title: string; content: string }> = {
  web_node: {
    title: 'Node.js & Web (React, Vite, Next.js)',
    content: `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing & Coverage
coverage/

# Production Build
dist/
build/
.next/
out/

# Environment Variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# OS Files
.DS_Store
Thumbs.db
__MACOSX/
`,
  },
  python: {
    title: 'Python (Django, Flask, FastAPI)',
    content: `# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# OS Junk
.DS_Store
Thumbs.db
`,
  },
  rust: {
    title: 'Rust (Cargo)',
    content: `# Generated by Cargo
/target/

# These are backup files generated by rustfmt
**/*.rs.bk

# OS & Editor
.DS_Store
Thumbs.db
.vscode/
.idea/
`,
  },
  general: {
    title: 'Genel & Sistem Çöpleri (Tüm Projeler)',
    content: `# macOS
.DS_Store
.AppleDouble
.LSOverride
__MACOSX/
._*

# Windows
Thumbs.db
Thumbs.db:encryptable
ehthumbs.db
ehthumbs_vista.db
*.stackdump
Desktop.ini

# Linux
*~
.fuse_hidden*
.directory
.Trash-*

# Secret Keys
.env
*.pem
*.key
`,
  },
};
