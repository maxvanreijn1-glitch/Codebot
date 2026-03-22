import { repoScanner, IndexedFile } from '../local-repo/scanner';

const MAX_CONTEXT_PREVIEW_LENGTH = 500;

export interface RepoContext {
  repoId: string;
  language: string;
  fileCount: number;
  relevantFiles: IndexedFile[];
  summary: string;
}

export class CopilotContextManager {
  buildContextForFile(
    repoPath: string,
    targetFile: string,
    maxContextFiles = 5
  ): RepoContext {
    const index = repoScanner.scanAndIndex(repoPath, 50);

    const targetExt = targetFile.split('.').pop() || '';
    const relevantFiles = index.files
      .filter(f => f.path !== targetFile)
      .filter(f => f.extension === `.${targetExt}` || this.isRelated(targetFile, f.path))
      .slice(0, maxContextFiles);

    const dominantLanguage = this.getDominantLanguage(index.languages);

    const summary = `Repository has ${index.totalFiles} files (${index.totalLines} total lines). `
      + `Primary language: ${dominantLanguage}. `
      + `Languages: ${Object.keys(index.languages).join(', ')}.`;

    return {
      repoId: repoPath,
      language: dominantLanguage,
      fileCount: index.totalFiles,
      relevantFiles,
      summary,
    };
  }

  buildContextSummary(context: RepoContext): string {
    const parts = [context.summary];

    if (context.relevantFiles.length > 0) {
      parts.push('\nRelated files:');
      for (const file of context.relevantFiles) {
        const preview = file.content.slice(0, MAX_CONTEXT_PREVIEW_LENGTH);
      const truncated = file.content.length > MAX_CONTEXT_PREVIEW_LENGTH;
      parts.push(`\n### ${file.path}\n\`\`\`${file.extension.slice(1)}\n${preview}${truncated ? '\n...' : ''}\n\`\`\``);
      }
    }

    return parts.join('\n');
  }

  private isRelated(targetFile: string, otherFile: string): boolean {
    const targetDir = targetFile.split('/').slice(0, -1).join('/');
    const otherDir = otherFile.split('/').slice(0, -1).join('/');
    return targetDir === otherDir;
  }

  private getDominantLanguage(languages: Record<string, number>): string {
    if (Object.keys(languages).length === 0) return 'Unknown';
    return Object.entries(languages).sort(([, a], [, b]) => b - a)[0][0];
  }
}

export const copilotContextManager = new CopilotContextManager();
