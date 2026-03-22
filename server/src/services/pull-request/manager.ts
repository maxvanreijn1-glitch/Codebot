import prisma from '../../prisma/client';

export type PRStatus = 'open' | 'approved' | 'merged' | 'closed';

export interface PullRequest {
  id: string;
  userId: string;
  repositoryId: string;
  title: string;
  description?: string;
  status: PRStatus;
  fileChanges: FileChange[];
  mergedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileChange {
  path: string;
  original: string;
  modified: string;
  explanation?: string;
}

export class PullRequestManager {
  async createPR(
    userId: string,
    repositoryId: string,
    title: string,
    description: string,
    fileChanges: FileChange[]
  ): Promise<PullRequest> {
    const record = await prisma.pullRequest.create({
      data: {
        userId,
        repositoryId,
        title,
        description: description || null,
        status: 'open',
        fileChanges: fileChanges as object[],
      },
    });
    return this.mapRecord(record);
  }

  async getPR(id: string, userId: string): Promise<PullRequest | null> {
    const record = await prisma.pullRequest.findFirst({
      where: { id, userId },
    });
    if (!record) return null;
    return this.mapRecord(record);
  }

  async listPRs(userId: string, repositoryId?: string): Promise<PullRequest[]> {
    const records = await prisma.pullRequest.findMany({
      where: {
        userId,
        ...(repositoryId ? { repositoryId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.mapRecord(r));
  }

  async updatePRStatus(id: string, userId: string, status: PRStatus): Promise<PullRequest | null> {
    const existing = await prisma.pullRequest.findFirst({ where: { id, userId } });
    if (!existing) return null;
    const record = await prisma.pullRequest.update({
      where: { id },
      data: { status },
    });
    return this.mapRecord(record);
  }

  async updatePR(
    id: string,
    userId: string,
    updates: { title?: string; description?: string; status?: PRStatus }
  ): Promise<PullRequest | null> {
    const existing = await prisma.pullRequest.findFirst({ where: { id, userId } });
    if (!existing) return null;
    const record = await prisma.pullRequest.update({
      where: { id },
      data: {
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
      },
    });
    return this.mapRecord(record);
  }

  async deletePR(id: string, userId: string): Promise<boolean> {
    const existing = await prisma.pullRequest.findFirst({ where: { id, userId } });
    if (!existing) return false;
    await prisma.pullRequest.delete({ where: { id } });
    return true;
  }

  private mapRecord(record: {
    id: string;
    userId: string;
    repositoryId: string | null;
    title: string;
    description: string | null;
    status: string;
    fileChanges: unknown;
    mergedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PullRequest {
    return {
      id: record.id,
      userId: record.userId,
      repositoryId: record.repositoryId ?? '',
      title: record.title,
      description: record.description ?? undefined,
      status: record.status as PRStatus,
      fileChanges: (record.fileChanges as FileChange[]) || [],
      mergedAt: record.mergedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

export const prManager = new PullRequestManager();
