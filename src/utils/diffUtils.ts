import { GitDiffChunk, GitDiffLine } from '../types';

/**
 * Computes a line-by-line diff between two strings.
 */
export function computeLineDiff(oldText: string, newText: string): {
  chunks: GitDiffChunk[];
  additions: number;
  deletions: number;
} {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];

  const lines: GitDiffLine[] = [];
  let additions = 0;
  let deletions = 0;

  // Simple LCS-based or line-matching diff algorithm
  let i = 0;
  let j = 0;

  let oldLineNum = 1;
  let newLineNum = 1;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      lines.push({
        type: 'normal',
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
        content: oldLines[i],
      });
      i++;
      j++;
    } else {
      // Lookahead to see if next lines match
      const nextMatchInNew = newLines.indexOf(oldLines[i], j);
      const nextMatchInOld = oldLines.indexOf(newLines[j], i);

      if (i < oldLines.length && (nextMatchInNew === -1 || (nextMatchInOld !== -1 && nextMatchInOld < nextMatchInNew))) {
        lines.push({
          type: 'del',
          oldLineNumber: oldLineNum++,
          content: oldLines[i],
        });
        deletions++;
        i++;
      } else if (j < newLines.length) {
        lines.push({
          type: 'add',
          newLineNumber: newLineNum++,
          content: newLines[j],
        });
        additions++;
        j++;
      } else if (i < oldLines.length) {
        lines.push({
          type: 'del',
          oldLineNumber: oldLineNum++,
          content: oldLines[i],
        });
        deletions++;
        i++;
      }
    }
  }

  // Group into unified chunk
  const chunks: GitDiffChunk[] = [
    {
      header: `@@ -1,${oldLines.length || 1} +1,${newLines.length || 1} @@`,
      lines: lines.length > 0 ? lines : [{ type: 'normal', oldLineNumber: 1, newLineNumber: 1, content: '(Dosya boş veya değişiklik yok)' }],
    },
  ];

  return { chunks, additions, deletions };
}
