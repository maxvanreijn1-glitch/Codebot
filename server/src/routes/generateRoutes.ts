import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getClaudeClient, MAX_TOKENS } from '../services/claude/client';
import {
  CODE_GENERATION_SYSTEM_PROMPT,
  CIRCUIT_GENERATION_SYSTEM_PROMPT,
} from '../services/claude/prompts';
import { parseJsonResponse } from '../utils/json';
import { pool } from '../db';

const router = Router();
router.use(authenticateToken);

const CODE_GEN_MODEL = 'claude-sonnet-4-20250514';

// Usage limits per tier (monthly)
const USAGE_LIMITS = {
  code: { free: 10, pro: 100, premium: Infinity },
  circuit: { free: 5, pro: 50, premium: Infinity },
} as const;

type GenerationType = 'code' | 'circuit';

async function checkAndIncrementGenerationUsage(
  userId: string,
  type: GenerationType,
  tier: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const ALLOWED_COLS = { code: 'code_generation_count', circuit: 'circuit_generation_count' } as const;
  const col = ALLOWED_COLS[type];
  const limitKey = tier as keyof (typeof USAGE_LIMITS)['code'];
  const limit = USAGE_LIMITS[type][limitKey] ?? USAGE_LIMITS[type].free;

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

// POST /api/generate/code – stream code generation
router.post('/code', async (req: AuthRequest, res: Response): Promise<void> => {
  const { prompt } = req.body as { prompt: string };
  if (!prompt?.trim()) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  const tier = req.user!.tier ?? 'free';
  const { allowed, remaining } = await checkAndIncrementGenerationUsage(
    req.user!.id,
    'code',
    tier,
  ).catch(() => ({ allowed: false, remaining: 0 }));

  if (!allowed) {
    res.status(429).json({
      error: `Code generation limit reached for your ${tier} plan. Upgrade to generate more.`,
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const client = getClaudeClient();
    const stream = await client.messages.stream({
      model: CODE_GEN_MODEL,
      max_tokens: MAX_TOKENS,
      system: CODE_GENERATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt.trim() }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    const final = await stream.finalMessage();
    res.write(
      `data: ${JSON.stringify({
        done: true,
        remaining,
        usage: {
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
        },
      })}\n\n`,
    );
    res.end();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Code generation failed';
    if (!res.headersSent) {
      res.status(500).json({ error: msg });
      return;
    }
    res.write(`data: ${JSON.stringify({ error: msg, done: true })}\n\n`);
    res.end();
  }
});

// POST /api/generate/circuit – generate circuit JSON (non-streaming so client can parse JSON)
router.post('/circuit', async (req: AuthRequest, res: Response): Promise<void> => {
  const { prompt } = req.body as { prompt: string };
  if (!prompt?.trim()) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  const tier = req.user!.tier ?? 'free';
  const { allowed, remaining } = await checkAndIncrementGenerationUsage(
    req.user!.id,
    'circuit',
    tier,
  ).catch(() => ({ allowed: false, remaining: 0 }));

  if (!allowed) {
    res.status(429).json({
      error: `Circuit generation limit reached for your ${tier} plan. Upgrade to generate more.`,
    });
    return;
  }

  // Stream the response so large circuits come through progressively
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const client = getClaudeClient();
    const stream = await client.messages.stream({
      model: CODE_GEN_MODEL,
      max_tokens: MAX_TOKENS,
      system: CIRCUIT_GENERATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt.trim() }],
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullText += chunk.delta.text;
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    const circuit = parseJsonResponse(fullText);
    const final = await stream.finalMessage();
    res.write(
      `data: ${JSON.stringify({
        done: true,
        circuit,
        remaining,
        usage: {
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
        },
      })}\n\n`,
    );
    res.end();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Circuit generation failed';
    if (!res.headersSent) {
      res.status(500).json({ error: msg });
      return;
    }
    res.write(`data: ${JSON.stringify({ error: msg, done: true })}\n\n`);
    res.end();
  }
});

export default router;
