import { pool } from '../../db';
import { localRepoManager } from './manager';
import { repoScanner } from './scanner';
import { v4 as uuidv4 } from 'uuid';

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export type CommandType =
  | 'repo:pull'
  | 'repo:push'
  | 'repo:sync'
  | 'repo:status'
  | 'repo:analyze'
  | 'pr:create'
  | 'pr:merge';

export interface Command {
  type: CommandType;
  repoId: string;
  userId: string;
  params?: Record<string, unknown>;
}

interface RepoPushParams {
  files?: Array<{ path: string; content: string }>;
}

interface PrCreateParams {
  title?: string;
  description?: string;
  files?: Array<{ path: string; original: string; modified: string; explanation?: string }>;
}

interface PrMergeParams {
  prId?: string;
}

export class CommandExecutor {
  async execute(command: Command): Promise<CommandResult> {
    const startTime = Date.now();
    const logId = uuidv4();

    try {
      await this.logCommandStart(logId, command);
      const result = await this.dispatch(command);
      await this.logCommandEnd(logId, 'success', result, Date.now() - startTime);
      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.logCommandEnd(logId, 'failed', null, Date.now() - startTime, errMsg);
      return { success: false, message: 'Command failed', error: errMsg };
    }
  }

  private async dispatch(command: Command): Promise<CommandResult> {
    switch (command.type) {
      case 'repo:pull':
        return this.repoPull(command);
      case 'repo:push':
        return this.repoPush(command);
      case 'repo:sync':
        return this.repoSync(command);
      case 'repo:status':
        return this.repoStatus(command);
      case 'repo:analyze':
        return this.repoAnalyze(command);
      case 'pr:create':
        return this.prCreate(command);
      case 'pr:merge':
        return this.prMerge(command);
      default:
        return { success: false, message: `Unknown command type: ${command.type}` };
    }
  }

  private async repoPull(command: Command): Promise<CommandResult> {
    const repo = await localRepoManager.getRepo(command.repoId, command.userId);
    if (!repo) return { success: false, message: 'Repository not found' };

    // Pull latest state: re-scan files to update index
    const files = localRepoManager.scanFiles(repo.localPath);
    await pool.query(
      'UPDATE local_repositories SET file_count = $1, last_synced = NOW() WHERE id = $2',
      [files.length, command.repoId]
    );

    return {
      success: true,
      message: `Pulled ${files.length} files from repository`,
      data: { fileCount: files.length, files: files.map(f => f.path) },
    };
  }

  private async repoPush(command: Command): Promise<CommandResult> {
    const repo = await localRepoManager.getRepo(command.repoId, command.userId);
    if (!repo) return { success: false, message: 'Repository not found' };

    const params = command.params as RepoPushParams | undefined;
    const filesToWrite = params?.files || [];

    const written: string[] = [];
    for (const file of filesToWrite) {
      localRepoManager.writeFileContent(repo.localPath, file.path, file.content);
      written.push(file.path);
    }

    await localRepoManager.updateSyncStatus(command.repoId);

    return {
      success: true,
      message: `Pushed ${written.length} file(s) to repository`,
      data: { writtenFiles: written },
    };
  }

  private async repoSync(command: Command): Promise<CommandResult> {
    const repo = await localRepoManager.getRepo(command.repoId, command.userId);
    if (!repo) return { success: false, message: 'Repository not found' };

    const index = repoScanner.scanAndIndex(repo.localPath);
    await pool.query(
      'UPDATE local_repositories SET file_count = $1, status = $2, last_synced = NOW() WHERE id = $3',
      [index.totalFiles, 'active', command.repoId]
    );

    return {
      success: true,
      message: `Synced repository: ${index.totalFiles} files, ${index.totalLines} lines`,
      data: {
        fileCount: index.totalFiles,
        totalLines: index.totalLines,
        languages: index.languages,
      },
    };
  }

  private async repoStatus(command: Command): Promise<CommandResult> {
    const repo = await localRepoManager.getRepo(command.repoId, command.userId);
    if (!repo) return { success: false, message: 'Repository not found' };

    const files = localRepoManager.scanFiles(repo.localPath);
    return {
      success: true,
      message: 'Repository status retrieved',
      data: {
        name: repo.name,
        status: repo.status,
        fileCount: files.length,
        lastSynced: repo.lastSynced,
        localPath: repo.localPath,
      },
    };
  }

  private async repoAnalyze(command: Command): Promise<CommandResult> {
    const repo = await localRepoManager.getRepo(command.repoId, command.userId);
    if (!repo) return { success: false, message: 'Repository not found' };

    const index = repoScanner.scanAndIndex(repo.localPath, 50);
    const codeSummary = repoScanner.getFileSummary(index.files.slice(0, 20));

    return {
      success: true,
      message: 'Repository ready for Claude analysis',
      data: {
        fileCount: index.totalFiles,
        totalLines: index.totalLines,
        languages: index.languages,
        codeSummary,
      },
    };
  }

  private async prCreate(command: Command): Promise<CommandResult> {
    const params = command.params as PrCreateParams | undefined;

    if (!params?.title || !params?.files?.length) {
      return { success: false, message: 'PR title and file changes are required' };
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO pull_requests (id, user_id, repository_id, title, description, status, file_changes)
       VALUES ($1, $2, $3, $4, $5, 'open', $6)`,
      [id, command.userId, command.repoId, params.title, params.description || null, JSON.stringify(params.files)]
    );

    return {
      success: true,
      message: `Pull request created: ${params.title}`,
      data: { prId: id, title: params.title },
    };
  }

  private async prMerge(command: Command): Promise<CommandResult> {
    const params = command.params as PrMergeParams | undefined;
    if (!params?.prId) return { success: false, message: 'PR ID is required' };

    const prResult = await pool.query(
      'SELECT * FROM pull_requests WHERE id = $1 AND user_id = $2',
      [params.prId, command.userId]
    );

    if (prResult.rows.length === 0) {
      return { success: false, message: 'Pull request not found' };
    }

    const pr = prResult.rows[0];
    if (pr.status !== 'open' && pr.status !== 'approved') {
      return { success: false, message: `Cannot merge PR with status: ${pr.status}` };
    }

    const repo = await localRepoManager.getRepo(command.repoId, command.userId);
    if (!repo) return { success: false, message: 'Repository not found' };

    const fileChanges = pr.file_changes as Array<{ path: string; modified: string }>;
    const merged: string[] = [];

    for (const change of fileChanges) {
      localRepoManager.writeFileContent(repo.localPath, change.path, change.modified);
      merged.push(change.path);
    }

    await pool.query(
      'UPDATE pull_requests SET status = $1, merged_at = NOW() WHERE id = $2',
      ['merged', params.prId]
    );

    return {
      success: true,
      message: `Merged PR: ${pr.title} (${merged.length} files)`,
      data: { mergedFiles: merged },
    };
  }

  private async logCommandStart(logId: string, command: Command): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO command_logs (id, user_id, repository_id, command_type, params, status)
         VALUES ($1, $2, $3, $4, $5, 'running')`,
        [logId, command.userId, command.repoId, command.type, JSON.stringify(command.params || {})]
      );
    } catch {
      // Non-critical: continue even if logging fails
    }
  }

  private async logCommandEnd(
    logId: string,
    status: 'success' | 'failed',
    result: unknown,
    durationMs: number,
    error?: string
  ): Promise<void> {
    try {
      await pool.query(
        `UPDATE command_logs SET status = $1, result = $2, duration_ms = $3, error_message = $4, completed_at = NOW()
         WHERE id = $5`,
        [status, JSON.stringify(result), durationMs, error || null, logId]
      );
    } catch {
      // Non-critical
    }
  }
}

export const commandExecutor = new CommandExecutor();
