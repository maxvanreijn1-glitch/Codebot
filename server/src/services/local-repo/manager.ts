import fs from 'fs';
import path from 'path';
import prisma from '../../prisma/client';
import { SUPPORTED_EXTENSIONS, EXCLUDED_DIRECTORIES } from './constants';

export interface LocalRepo {
  id: string;
  userId: string;
  name: string;
  description?: string;
  localPath: string;
  status: 'active' | 'syncing' | 'error';
  lastSynced?: Date;
  fileCount: number;
  createdAt: Date;
}

export interface RepoFile {
  path: string;
  name: string;
  extension: string;
  size: number;
  content?: string;
  modifiedAt: Date;
}

export class LocalRepoManager {
  private repoBasePath: string;

  constructor() {
    this.repoBasePath = process.env.LOCAL_REPOS_PATH || path.join(process.cwd(), 'local-repos');
    if (!fs.existsSync(this.repoBasePath)) {
      fs.mkdirSync(this.repoBasePath, { recursive: true });
    }
  }

  async createRepo(userId: string, name: string, description?: string): Promise<LocalRepo> {
    // Create a placeholder directory; will be renamed after Prisma assigns the UUID
    const tempId = `tmp-${Date.now()}`;
    const tempPath = path.join(this.repoBasePath, userId, tempId);
    fs.mkdirSync(tempPath, { recursive: true });

    let record;
    try {
      record = await prisma.localRepository.create({
        data: {
          userId,
          name,
          description: description || null,
          localPath: tempPath,
          status: 'active',
          fileCount: 0,
        },
      });
    } catch (err) {
      // Clean up temp directory if DB insert failed
      fs.rmSync(tempPath, { recursive: true, force: true });
      throw err;
    }

    // Rename the directory to use the real UUID
    const repoPath = path.join(this.repoBasePath, userId, record.id);
    try {
      fs.renameSync(tempPath, repoPath);
    } catch (err) {
      // Clean up DB record and temp dir if rename failed
      await prisma.localRepository.delete({ where: { id: record.id } }).catch(() => undefined);
      fs.rmSync(tempPath, { recursive: true, force: true });
      throw err;
    }

    // Update the stored path to the final directory
    const updated = await prisma.localRepository.update({
      where: { id: record.id },
      data: { localPath: repoPath },
    });

    return this.mapRecord(updated);
  }

  async getRepo(id: string, userId: string): Promise<LocalRepo | null> {
    const record = await prisma.localRepository.findFirst({
      where: { id, userId },
    });
    if (!record) return null;
    return this.mapRecord(record);
  }

  async listRepos(userId: string): Promise<LocalRepo[]> {
    const records = await prisma.localRepository.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.mapRecord(r));
  }

  async deleteRepo(id: string, userId: string): Promise<boolean> {
    const repo = await this.getRepo(id, userId);
    if (!repo) return false;

    if (fs.existsSync(repo.localPath)) {
      fs.rmSync(repo.localPath, { recursive: true, force: true });
    }

    await prisma.localRepository.delete({ where: { id } });
    return true;
  }

  async getRepoStatus(id: string, userId: string): Promise<{ status: string; fileCount: number; lastSynced?: Date }> {
    const repo = await this.getRepo(id, userId);
    if (!repo) throw new Error('Repository not found');

    const files = this.scanFiles(repo.localPath);
    return {
      status: repo.status,
      fileCount: files.length,
      lastSynced: repo.lastSynced,
    };
  }

  scanFiles(dirPath: string, maxFiles = 200): RepoFile[] {
    if (!fs.existsSync(dirPath)) return [];

    const files: RepoFile[] = [];
    this.walkDir(dirPath, dirPath, files, maxFiles);
    return files;
  }

  private walkDir(baseDir: string, currentDir: string, files: RepoFile[], maxFiles: number): void {
    if (files.length >= maxFiles) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      if (entry.name.startsWith('.') || EXCLUDED_DIRECTORIES.includes(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        this.walkDir(baseDir, fullPath, files, maxFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          const stat = fs.statSync(fullPath);
          files.push({
            path: relativePath,
            name: entry.name,
            extension: ext,
            size: stat.size,
            modifiedAt: stat.mtime,
          });
        }
      }
    }
  }

  readFileContent(repoPath: string, filePath: string): string {
    const fullPath = path.join(repoPath, filePath);
    const resolvedPath = path.resolve(fullPath);
    const resolvedBase = path.resolve(repoPath);
    const relative = path.relative(resolvedBase, resolvedPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Access denied: path traversal detected');
    }
    return fs.readFileSync(resolvedPath, 'utf-8');
  }

  writeFileContent(repoPath: string, filePath: string, content: string): void {
    const fullPath = path.join(repoPath, filePath);
    const resolvedPath = path.resolve(fullPath);
    const resolvedBase = path.resolve(repoPath);
    const relative = path.relative(resolvedBase, resolvedPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Access denied: path traversal detected');
    }
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, content, 'utf-8');
  }

  async updateSyncStatus(id: string): Promise<void> {
    await prisma.localRepository.update({
      where: { id },
      data: { status: 'active', lastSynced: new Date() },
    });
  }

  private mapRecord(record: {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    localPath: string;
    status: string;
    lastSynced: Date | null;
    fileCount: number;
    createdAt: Date;
  }): LocalRepo {
    return {
      id: record.id,
      userId: record.userId,
      name: record.name,
      description: record.description ?? undefined,
      localPath: record.localPath,
      status: record.status as 'active' | 'syncing' | 'error',
      lastSynced: record.lastSynced ?? undefined,
      fileCount: record.fileCount,
      createdAt: record.createdAt,
    };
  }
}

export const localRepoManager = new LocalRepoManager();
