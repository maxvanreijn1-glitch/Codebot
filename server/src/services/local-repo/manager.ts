import fs from 'fs';
import path from 'path';
import { pool } from '../../db';
import { v4 as uuidv4 } from 'uuid';
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
    const id = uuidv4();
    const repoPath = path.join(this.repoBasePath, userId, id);
    fs.mkdirSync(repoPath, { recursive: true });

    const result = await pool.query(
      `INSERT INTO local_repositories (id, user_id, name, description, local_path, status, file_count)
       VALUES ($1, $2, $3, $4, $5, 'active', 0) RETURNING *`,
      [id, userId, name, description || null, repoPath]
    );

    return this.mapRow(result.rows[0]);
  }

  async getRepo(id: string, userId: string): Promise<LocalRepo | null> {
    const result = await pool.query(
      'SELECT * FROM local_repositories WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async listRepos(userId: string): Promise<LocalRepo[]> {
    const result = await pool.query(
      'SELECT * FROM local_repositories WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(this.mapRow);
  }

  async deleteRepo(id: string, userId: string): Promise<boolean> {
    const repo = await this.getRepo(id, userId);
    if (!repo) return false;

    if (fs.existsSync(repo.localPath)) {
      fs.rmSync(repo.localPath, { recursive: true, force: true });
    }

    await pool.query('DELETE FROM local_repositories WHERE id = $1', [id]);
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
    await pool.query(
      'UPDATE local_repositories SET status = $1, last_synced = NOW() WHERE id = $2',
      ['active', id]
    );
  }

  private mapRow(row: Record<string, unknown>): LocalRepo {
    return {
      id: row['id'] as string,
      userId: row['user_id'] as string,
      name: row['name'] as string,
      description: row['description'] as string | undefined,
      localPath: row['local_path'] as string,
      status: row['status'] as 'active' | 'syncing' | 'error',
      lastSynced: row['last_synced'] ? new Date(row['last_synced'] as string) : undefined,
      fileCount: row['file_count'] as number,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}

export const localRepoManager = new LocalRepoManager();
