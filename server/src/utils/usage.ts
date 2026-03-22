import { pool } from '../db';

export async function checkAndIncrementUsage(userId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT usage_count, usage_limit FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    const { usage_count, usage_limit } = result.rows[0];
    if (usage_count >= usage_limit) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(
      'UPDATE users SET usage_count = usage_count + 1 WHERE id = $1',
      [userId]
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function resetUsage(userId: string): Promise<void> {
  await pool.query('UPDATE users SET usage_count = 0 WHERE id = $1', [userId]);
}

export const TIER_LIMITS = {
  free: 5,
  pro: 50,
  premium: 1000,
} as const;
