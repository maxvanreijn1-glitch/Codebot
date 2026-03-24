import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getClaudeClient, MAX_TOKENS } from '../services/claude/client';
import {
  CODE_GENERATION_SYSTEM_PROMPT,
  CIRCUIT_GENERATION_SYSTEM_PROMPT,
} from '../services/claude/prompts';
import { parseJsonResponse } from '../utils/json';
import { checkAndIncrementGenerationUsage } from '../utils/usage';

const router = Router();
router.use(authenticateToken);

const CODE_GEN_MODEL = 'claude-sonnet-4-20250514';

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
