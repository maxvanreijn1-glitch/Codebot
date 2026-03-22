import { useState } from 'react';
import { FileChange } from '../types';

interface DiffViewerProps {
  fileChanges: FileChange[];
}

// Maximum lines to include in LCS computation to bound O(m*n) time/memory complexity
const MAX_DIFF_LINES = 200;

function computeLCS(a: string[], b: string[]): string[] {
  const m = Math.min(a.length, MAX_DIFF_LINES);
  const n = Math.min(b.length, MAX_DIFF_LINES);
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { lcs.unshift(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return lcs;
}

function computeLineDiff(original: string, modified: string): Array<{ type: 'same' | 'removed' | 'added'; line: string }> {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const result: Array<{ type: 'same' | 'removed' | 'added'; line: string }> = [];

  const lcs = computeLCS(originalLines, modifiedLines);
  let oi = 0, mi = 0;
  for (const line of lcs) {
    while (oi < originalLines.length && originalLines[oi] !== line) {
      result.push({ type: 'removed', line: originalLines[oi] });
      oi++;
    }
    while (mi < modifiedLines.length && modifiedLines[mi] !== line) {
      result.push({ type: 'added', line: modifiedLines[mi] });
      mi++;
    }
    result.push({ type: 'same', line });
    oi++;
    mi++;
  }
  while (oi < originalLines.length) {
    result.push({ type: 'removed', line: originalLines[oi++] });
  }
  while (mi < modifiedLines.length) {
    result.push({ type: 'added', line: modifiedLines[mi++] });
  }
  return result;
}

export default function DiffViewer({ fileChanges }: DiffViewerProps) {
  const [activeFile, setActiveFile] = useState(0);

  if (!fileChanges || fileChanges.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">No file changes to display</div>
    );
  }

  const current = fileChanges[activeFile];
  const diffLines = computeLineDiff(current.original || '', current.modified || '');
  const hasChanges = diffLines.some(l => l.type !== 'same');

  return (
    <div className="space-y-4">
      {fileChanges.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {fileChanges.map((fc, idx) => (
            <button
              key={idx}
              onClick={() => setActiveFile(idx)}
              className={`px-3 py-1 rounded text-sm font-mono transition-colors ${
                activeFile === idx
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {fc.filename}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-lg overflow-hidden border border-gray-700">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-mono text-gray-300">{current.filename}</span>
          {!hasChanges && <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">No changes</span>}
        </div>
        {current.explanation && (
          <div className="bg-blue-900/20 border-b border-blue-800/30 px-4 py-2 text-sm text-blue-300">
            💡 {current.explanation}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <tbody>
              {diffLines.map((line, idx) => (
                <tr
                  key={idx}
                  className={
                    line.type === 'removed'
                      ? 'bg-red-900/30 hover:bg-red-900/40'
                      : line.type === 'added'
                      ? 'bg-green-900/30 hover:bg-green-900/40'
                      : 'hover:bg-gray-800/30'
                  }
                >
                  <td className="w-10 text-center text-gray-600 select-none border-r border-gray-700 py-0.5 px-2">
                    {line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '}
                  </td>
                  <td className={`py-0.5 px-4 whitespace-pre ${
                    line.type === 'removed' ? 'text-red-300' : line.type === 'added' ? 'text-green-300' : 'text-gray-300'
                  }`}>
                    {line.line || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
