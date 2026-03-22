import { createTwoFilesPatch } from 'diff';

export interface DiffResult {
  filename: string;
  patch: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export class PRDiffer {
  generateDiff(filename: string, original: string, modified: string): DiffResult {
    const patch = createTwoFilesPatch(
      `a/${filename}`,
      `b/${filename}`,
      original,
      modified,
      '',
      '',
      { context: 3 }
    );

    const hunks = this.parseHunks(patch);
    const { additions, deletions } = this.countChanges(hunks);

    return { filename, patch, additions, deletions, hunks };
  }

  generateMultiFileDiff(
    files: Array<{ path: string; original: string; modified: string }>
  ): DiffResult[] {
    return files.map(f => this.generateDiff(f.path, f.original, f.modified));
  }

  private parseHunks(patch: string): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    const hunkHeaderRegex = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/;
    const lines = patch.split('\n');

    let currentHunk: DiffHunk | null = null;

    for (const line of lines) {
      const match = hunkHeaderRegex.exec(line);
      if (match) {
        if (currentHunk) hunks.push(currentHunk);
        currentHunk = {
          oldStart: parseInt(match[1], 10),
          // Per unified diff format, an absent count (e.g. "@@ -1 +1 @@") means 1 line
          oldLines: match[2] !== '' ? parseInt(match[2], 10) : 1,
          newStart: parseInt(match[3], 10),
          newLines: match[4] !== '' ? parseInt(match[4], 10) : 1,
          lines: [],
        };
      } else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
        currentHunk.lines.push(line);
      }
    }

    if (currentHunk) hunks.push(currentHunk);
    return hunks;
  }

  private countChanges(hunks: DiffHunk[]): { additions: number; deletions: number } {
    let additions = 0;
    let deletions = 0;

    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.startsWith('+')) additions++;
        else if (line.startsWith('-')) deletions++;
      }
    }

    return { additions, deletions };
  }
}

export const prDiffer = new PRDiffer();
