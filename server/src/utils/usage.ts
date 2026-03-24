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

// Plan-based limits for code and circuit generation (monthly)
export const GENERATION_LIMITS = {
  code: { free: 10, pro: 100, premium: Infinity },
  circuit: { free: 5, pro: 50, premium: Infinity },
} as const;

export type GenerationType = 'code' | 'circuit';

export async function checkAndIncrementGenerationUsage(
  userId: string,
  type: GenerationType,
  tier: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const ALLOWED_COLS = {
    code: 'code_generation_count',
    circuit: 'circuit_generation_count',
  } as const;
  // Explicitly validate type against the whitelist to prevent any SQL injection
  if (!(type in ALLOWED_COLS)) {
    throw new Error(`Invalid generation type: ${type}`);
  }
  const col = ALLOWED_COLS[type];
  const limitKey = tier as keyof (typeof GENERATION_LIMITS)['code'];
  const limit = GENERATION_LIMITS[type][limitKey] ?? GENERATION_LIMITS[type].free;

  if (limit === Infinity) return { allowed: true, remaining: -1 };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Reset monthly counter if needed
    await client.query(
      `UPDATE users
         SET ${col} = 0,
             generation_reset_at = date_trunc('month', NOW()) + interval '1 month'
       WHERE id = $1
         AND (generation_reset_at IS NULL OR generation_reset_at <= NOW())`,
      [userId],
    );

    const result = await client.query(
      `SELECT ${col} AS count FROM users WHERE id = $1 FOR UPDATE`,
      [userId],
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return { allowed: false, remaining: 0 };
    }

    const current: number = result.rows[0].count ?? 0;
    if (current >= limit) {
      await client.query('ROLLBACK');
      return { allowed: false, remaining: 0 };
    }

    await client.query(`UPDATE users SET ${col} = ${col} + 1 WHERE id = $1`, [userId]);
    await client.query('COMMIT');
    return { allowed: true, remaining: limit - current - 1 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
