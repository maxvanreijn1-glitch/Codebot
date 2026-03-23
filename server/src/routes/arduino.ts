import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getClaudeClient, DEFAULT_MODEL, MAX_TOKENS } from '../services/claude/client';
import {
  ARDUINO_CHAT_SYSTEM_PROMPT,
  ARDUINO_GENERATE_CODE_PROMPT,
  ARDUINO_GENERATE_CIRCUIT_PROMPT,
  ARDUINO_TROUBLESHOOT_PROMPT,
  WEB_ASSISTANT_SYSTEM_PROMPT,
} from '../services/claude/prompts';
import { streamAnalysis } from '../services/claude/streaming';
import { checkAndIncrementUsage } from '../utils/usage';
import { parseJsonResponse } from '../utils/json';

const router = Router();
router.use(authenticateToken);

// POST /api/arduino/chat – streaming Arduino chat assistant
router.post('/chat', async (req: AuthRequest, res: Response): Promise<void> => {
  const { message, history } = req.body as {
    message: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
  };

  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  try {
    const canProceed = await checkAndIncrementUsage(req.user!.id);
    if (!canProceed) {
      res.status(429).json({ error: 'Usage limit reached. Please upgrade your plan.' });
      return;
    }

    const client = getClaudeClient();

    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...(history ?? []),
      { role: 'user', content: message },
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.stream({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: ARDUINO_CHAT_SYSTEM_PROMPT,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    const finalMessage = await stream.finalMessage();
    res.write(
      `data: ${JSON.stringify({
        done: true,
        usage: {
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
        },
      })}\n\n`,
    );
    res.end();
  } catch (error) {
    console.error('Arduino chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat request failed' });
    }
  }
});

// POST /api/arduino/generate-code – generate Arduino code from circuit layout
router.post('/generate-code', async (req: AuthRequest, res: Response): Promise<void> => {
  const { circuitDescription } = req.body as { circuitDescription: string };

  if (!circuitDescription) {
    res.status(400).json({ error: 'circuitDescription is required' });
    return;
  }

  try {
    const canProceed = await checkAndIncrementUsage(req.user!.id);
    if (!canProceed) {
      res.status(429).json({ error: 'Usage limit reached. Please upgrade your plan.' });
      return;
    }

    await streamAnalysis(ARDUINO_GENERATE_CODE_PROMPT, circuitDescription, res);
  } catch (error) {
    console.error('Arduino generate-code error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Code generation failed' });
    }
  }
});

// POST /api/arduino/generate-circuit – generate circuit layout JSON from Arduino code
router.post('/generate-circuit', async (req: AuthRequest, res: Response): Promise<void> => {
  const { code } = req.body as { code: string };

  if (!code) {
    res.status(400).json({ error: 'code is required' });
    return;
  }

  try {
    const canProceed = await checkAndIncrementUsage(req.user!.id);
    if (!canProceed) {
      res.status(429).json({ error: 'Usage limit reached. Please upgrade your plan.' });
      return;
    }

    const client = getClaudeClient();
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: ARDUINO_GENERATE_CIRCUIT_PROMPT,
      messages: [{ role: 'user', content: `Generate the circuit layout for this Arduino sketch:\n\n${code}` }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const circuit = parseJsonResponse(text);

    if (!circuit) {
      res.status(500).json({ error: 'Failed to parse circuit layout from AI response' });
      return;
    }

    res.json({ circuit, tokensUsed: response.usage.input_tokens + response.usage.output_tokens });
  } catch (error) {
    console.error('Arduino generate-circuit error:', error);
    res.status(500).json({ error: 'Circuit generation failed' });
  }
});

// POST /api/arduino/troubleshoot – diagnose Arduino problems
router.post('/troubleshoot', async (req: AuthRequest, res: Response): Promise<void> => {
  const { problem } = req.body as { problem: string };

  if (!problem) {
    res.status(400).json({ error: 'problem is required' });
    return;
  }

  try {
    const canProceed = await checkAndIncrementUsage(req.user!.id);
    if (!canProceed) {
      res.status(429).json({ error: 'Usage limit reached. Please upgrade your plan.' });
      return;
    }

    await streamAnalysis(ARDUINO_TROUBLESHOOT_PROMPT, problem, res);
  } catch (error) {
    console.error('Arduino troubleshoot error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Troubleshoot request failed' });
    }
  }
});

// POST /api/arduino/web-chat – streaming Web & App assistant chat
router.post('/web-chat', async (req: AuthRequest, res: Response): Promise<void> => {
  const { message, history } = req.body as {
    message: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
  };

  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  try {
    const canProceed = await checkAndIncrementUsage(req.user!.id);
    if (!canProceed) {
      res.status(429).json({ error: 'Usage limit reached. Please upgrade your plan.' });
      return;
    }

    const client = getClaudeClient();

    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...(history ?? []),
      { role: 'user', content: message },
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.stream({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: WEB_ASSISTANT_SYSTEM_PROMPT,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    const finalMessage = await stream.finalMessage();
    res.write(
      `data: ${JSON.stringify({
        done: true,
        usage: {
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
        },
      })}\n\n`,
    );
    res.end();
  } catch (error) {
    console.error('Web chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat request failed' });
    }
  }
});

export default router;
