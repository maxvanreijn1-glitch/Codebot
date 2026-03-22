import { localRepoManager } from '../local-repo/manager';
import { prManager, FileChange } from './manager';
import prisma from '../../prisma/client';

export interface MergeResult {
  success: boolean;
  mergedFiles: string[];
  skippedFiles: string[];
  error?: string;
}

export class PRMerger {
  async mergePR(prId: string, userId: string): Promise<MergeResult> {
    const pr = await prManager.getPR(prId, userId);
    if (!pr) {
      return { success: false, mergedFiles: [], skippedFiles: [], error: 'PR not found' };
    }

    if (pr.status !== 'open' && pr.status !== 'approved') {
      return {
        success: false,
        mergedFiles: [],
        skippedFiles: [],
        error: `Cannot merge PR with status: ${pr.status}`,
      };
    }

    const repo = await localRepoManager.getRepo(pr.repositoryId, userId);
    if (!repo) {
      return { success: false, mergedFiles: [], skippedFiles: [], error: 'Repository not found' };
    }

    const mergedFiles: string[] = [];
    const skippedFiles: string[] = [];

    for (const change of pr.fileChanges) {
      try {
        localRepoManager.writeFileContent(repo.localPath, change.path, change.modified);
        mergedFiles.push(change.path);
      } catch (err) {
        console.error(`Failed to write ${change.path}:`, err);
        skippedFiles.push(change.path);
      }
    }

    await prisma.pullRequest.update({
      where: { id: prId },
      data: { status: 'merged', mergedAt: new Date() },
    });

    await localRepoManager.updateSyncStatus(pr.repositoryId);

    return { success: true, mergedFiles, skippedFiles };
  }

  async revertMerge(prId: string, userId: string, originalContents: FileChange[]): Promise<MergeResult> {
    const pr = await prManager.getPR(prId, userId);
    if (!pr) {
      return { success: false, mergedFiles: [], skippedFiles: [], error: 'PR not found' };
    }

    const repo = await localRepoManager.getRepo(pr.repositoryId, userId);
    if (!repo) {
      return { success: false, mergedFiles: [], skippedFiles: [], error: 'Repository not found' };
    }

    const revertedFiles: string[] = [];
    const skippedFiles: string[] = [];

    for (const change of originalContents) {
      try {
        localRepoManager.writeFileContent(repo.localPath, change.path, change.original);
        revertedFiles.push(change.path);
      } catch (err) {
        console.error(`Failed to revert ${change.path}:`, err);
        skippedFiles.push(change.path);
      }
    }

    await prisma.pullRequest.update({
      where: { id: prId },
      data: { status: 'open', mergedAt: null },
    });

    return { success: true, mergedFiles: revertedFiles, skippedFiles };
  }
}

export const prMerger = new PRMerger();
