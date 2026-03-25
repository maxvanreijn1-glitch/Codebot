import { pool } from '../db';

export const GENERATION_LIMITS = {
  code: { free: 10, pro: 100, premium: Infinity, admin: Infinity },
  circuit: { free: 5, pro: 50, premium: Infinity, admin: Infinity },
} as const;

export type GenerationType = 'code' | 'circuit';

const ALLOWED_COLS: Record<GenerationType, string> = {
  code: 'code_generation_count',
  circuit: 'circuit_generation_count',
};

export async function checkAndIncrementGenerationUsage(
  userId: string,
  type: GenerationType,
  tier: string,
): Promise<{ allowed: boolean; remaining: number }> {
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

    // Log the usage
    await pool.query(
      `INSERT INTO usage_logs (id, user_id, type, created_at)
       VALUES (gen_random_uuid(), $1, $2, NOW())`,
      [userId, type],
    ).catch(() => {/* non-critical */});

    return { allowed: true, remaining: limit - current - 1 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getUserUsage(
  userId: string,
): Promise<{ code: number; circuit: number; tier: string }> {
  const result = await pool.query(
    `SELECT code_generation_count, circuit_generation_count, tier
       FROM users WHERE id = $1`,
    [userId],
  );
  if (!result.rows.length) return { code: 0, circuit: 0, tier: 'free' };
  const { code_generation_count, circuit_generation_count, tier } = result.rows[0];
  return {
    code: code_generation_count ?? 0,
    circuit: circuit_generation_count ?? 0,
    tier: tier ?? 'free',
  };
}
