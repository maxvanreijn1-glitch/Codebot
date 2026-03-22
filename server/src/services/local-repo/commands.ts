import prisma from '../../prisma/client';
import { localRepoManager } from './manager';
import { repoScanner } from './scanner';

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
    let logId: string | undefined;

    try {
      logId = await this.logCommandStart(command);
      const result = await this.dispatch(command);
      await this.logCommandEnd(logId, 'success', result, Date.now() - startTime);
      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      if (logId) {
        await this.logCommandEnd(logId, 'failed', null, Date.now() - startTime, errMsg);
      }
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

    const files = localRepoManager.scanFiles(repo.localPath);
    await prisma.localRepository.update({
      where: { id: command.repoId },
      data: { fileCount: files.length, lastSynced: new Date() },
    });

    return {
      success: true,
      message: `Pulled ${files.length} files from repository`,
      data: { fileCount: files.length, files: files.map((f) => f.path) },
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
    await prisma.localRepository.update({
      where: { id: command.repoId },
      data: { fileCount: index.totalFiles, status: 'active', lastSynced: new Date() },
    });

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

    const pr = await prisma.pullRequest.create({
      data: {
        userId: command.userId,
        repositoryId: command.repoId,
        title: params.title,
        description: params.description || null,
        status: 'open',
        fileChanges: params.files as object[],
      },
    });

    return {
      success: true,
      message: `Pull request created: ${params.title}`,
      data: { prId: pr.id, title: params.title },
    };
  }

  private async prMerge(command: Command): Promise<CommandResult> {
    const params = command.params as PrMergeParams | undefined;
    if (!params?.prId) return { success: false, message: 'PR ID is required' };

    const pr = await prisma.pullRequest.findFirst({
      where: { id: params.prId, userId: command.userId },
    });

    if (!pr) return { success: false, message: 'Pull request not found' };
    if (pr.status !== 'open' && pr.status !== 'approved') {
      return { success: false, message: `Cannot merge PR with status: ${pr.status}` };
    }

    const repo = await localRepoManager.getRepo(command.repoId, command.userId);
    if (!repo) return { success: false, message: 'Repository not found' };

    const fileChanges = pr.fileChanges as Array<{ path: string; modified: string }>;
    const merged: string[] = [];

    for (const change of fileChanges) {
      localRepoManager.writeFileContent(repo.localPath, change.path, change.modified);
      merged.push(change.path);
    }

    await prisma.pullRequest.update({
      where: { id: params.prId },
      data: { status: 'merged', mergedAt: new Date() },
    });

    return {
      success: true,
      message: `Merged PR: ${pr.title} (${merged.length} files)`,
      data: { mergedFiles: merged },
    };
  }

  private async logCommandStart(command: Command): Promise<string> {
    try {
      const log = await prisma.commandLog.create({
        data: {
          userId: command.userId,
          repositoryId: command.repoId,
          commandType: command.type,
          params: (command.params || {}) as object,
          status: 'running',
        },
      });
      return log.id;
    } catch {
      // Non-critical: return a dummy id
      return 'no-log';
    }
  }

  private async logCommandEnd(
    logId: string,
    status: 'success' | 'failed',
    result: unknown,
    durationMs: number,
    error?: string
  ): Promise<void> {
    if (logId === 'no-log') return;
    try {
      await prisma.commandLog.update({
        where: { id: logId },
        data: {
          status,
          result: result as object,
          durationMs,
          errorMessage: error || null,
          completedAt: new Date(),
        },
      });
    } catch {
      // Non-critical
    }
  }
}

export const commandExecutor = new CommandExecutor();
