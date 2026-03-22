import { pool } from '../../db';
import { v4 as uuidv4 } from 'uuid';

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
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO pull_requests (id, user_id, repository_id, title, description, status, file_changes)
       VALUES ($1, $2, $3, $4, $5, 'open', $6) RETURNING *`,
      [id, userId, repositoryId, title, description || null, JSON.stringify(fileChanges)]
    );
    return this.mapRow(result.rows[0]);
  }

  async getPR(id: string, userId: string): Promise<PullRequest | null> {
    const result = await pool.query(
      'SELECT * FROM pull_requests WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async listPRs(userId: string, repositoryId?: string): Promise<PullRequest[]> {
    let query = 'SELECT * FROM pull_requests WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (repositoryId) {
      query += ' AND repository_id = $2';
      params.push(repositoryId);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    return result.rows.map(this.mapRow);
  }

  async updatePRStatus(id: string, userId: string, status: PRStatus): Promise<PullRequest | null> {
    const result = await pool.query(
      `UPDATE pull_requests SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [status, id, userId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async updatePR(
    id: string,
    userId: string,
    updates: { title?: string; description?: string; status?: PRStatus }
  ): Promise<PullRequest | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      params.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(updates.status);
    }

    params.push(id, userId);

    const result = await pool.query(
      `UPDATE pull_requests SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async deletePR(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM pull_requests WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): PullRequest {
    return {
      id: row['id'] as string,
      userId: row['user_id'] as string,
      repositoryId: row['repository_id'] as string,
      title: row['title'] as string,
      description: row['description'] as string | undefined,
      status: row['status'] as PRStatus,
      fileChanges: (row['file_changes'] as FileChange[]) || [],
      mergedAt: row['merged_at'] ? new Date(row['merged_at'] as string) : undefined,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}

export const prManager = new PullRequestManager();
