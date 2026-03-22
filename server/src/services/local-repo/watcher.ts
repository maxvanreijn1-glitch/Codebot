import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export interface FileChangeEvent {
  repoId: string;
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted';
  timestamp: Date;
}

export class FileWatcher extends EventEmitter {
  private watchers: Map<string, fs.FSWatcher> = new Map();

  watchRepo(repoId: string, repoPath: string): void {
    if (this.watchers.has(repoId)) {
      this.unwatchRepo(repoId);
    }

    if (!fs.existsSync(repoPath)) return;

    try {
      const watcher = fs.watch(repoPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        if (filename.includes('node_modules') || filename.startsWith('.')) return;

        const fullPath = path.join(repoPath, filename);
        let changeType: 'created' | 'modified' | 'deleted';
        if (eventType === 'rename') {
          changeType = fs.existsSync(fullPath) ? 'created' : 'deleted';
        } else {
          changeType = 'modified';
        }

        const event: FileChangeEvent = {
          repoId,
          filePath: filename,
          changeType,
          timestamp: new Date(),
        };
        this.emit('change', event);
      });

      watcher.on('error', (err) => {
        console.error(`Watcher error for repo ${repoId}:`, err);
        this.unwatchRepo(repoId);
      });

      this.watchers.set(repoId, watcher);
    } catch (err) {
      console.error(`Failed to watch repo ${repoId}:`, err);
    }
  }

  unwatchRepo(repoId: string): void {
    const watcher = this.watchers.get(repoId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(repoId);
    }
  }

  unwatchAll(): void {
    for (const repoId of this.watchers.keys()) {
      this.unwatchRepo(repoId);
    }
  }

  getWatchedRepos(): string[] {
    return Array.from(this.watchers.keys());
  }
}

export const fileWatcher = new FileWatcher();

export function getFileSnapshot(repoPath: string): Map<string, { mtime: number; size: number }> {
  const snapshot = new Map<string, { mtime: number; size: number }>();

  function walkDir(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(repoPath, fullPath);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile()) {
          const stat = fs.statSync(fullPath);
          snapshot.set(relativePath, { mtime: stat.mtimeMs, size: stat.size });
        }
      }
    } catch {
      // ignore errors
    }
  }

  walkDir(repoPath);
  return snapshot;
}
