import fs from 'fs';
import path from 'path';
import { EXCLUDED_DIRECTORIES } from './constants';

export interface IndexedFile {
  path: string;
  name: string;
  extension: string;
  size: number;
  content: string;
  lines: number;
  language: string;
}

export interface RepoIndex {
  totalFiles: number;
  totalLines: number;
  languages: Record<string, number>;
  files: IndexedFile[];
  indexedAt: Date;
}

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.java': 'Java',
  '.go': 'Go',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.h': 'C/C++ Header',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.toml': 'TOML',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.bash': 'Bash',
};

export class RepoScanner {
  scanAndIndex(dirPath: string, maxFiles = 100, maxFileSizeKb = 500): RepoIndex {
    const files: IndexedFile[] = [];
    const languages: Record<string, number> = {};

    if (!fs.existsSync(dirPath)) {
      return { totalFiles: 0, totalLines: 0, languages: {}, files: [], indexedAt: new Date() };
    }

    this.walkAndIndex(dirPath, dirPath, files, languages, maxFiles, maxFileSizeKb * 1024);

    const totalLines = files.reduce((sum, f) => sum + f.lines, 0);

    return {
      totalFiles: files.length,
      totalLines,
      languages,
      files,
      indexedAt: new Date(),
    };
  }

  private walkAndIndex(
    baseDir: string,
    currentDir: string,
    files: IndexedFile[],
    languages: Record<string, number>,
    maxFiles: number,
    maxFileSize: number
  ): void {
    if (files.length >= maxFiles) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      if (entry.name.startsWith('.') || EXCLUDED_DIRECTORIES.includes(entry.name)) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        this.walkAndIndex(baseDir, fullPath, files, languages, maxFiles, maxFileSize);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const language = LANGUAGE_MAP[ext];
        if (!language) continue;

        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }

        if (stat.size > maxFileSize) continue;

        let content: string;
        try {
          content = fs.readFileSync(fullPath, 'utf-8');
        } catch {
          continue;
        }

        const lines = content.split('\n').length;
        languages[language] = (languages[language] || 0) + 1;

        files.push({
          path: relativePath,
          name: entry.name,
          extension: ext,
          size: stat.size,
          content,
          lines,
          language,
        });
      }
    }
  }

  getFileSummary(files: IndexedFile[]): string {
    return files
      .map(f => `### File: ${f.path}\n\`\`\`${f.extension.slice(1)}\n${f.content}\n\`\`\``)
      .join('\n\n');
  }
}

export const repoScanner = new RepoScanner();
