import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getClaudeClient, DEFAULT_MODEL, MAX_TOKENS } from '../services/claude/client';
import { CODE_ANALYSIS_SYSTEM_PROMPT } from '../services/claude/prompts';
import { streamAnalysis } from '../services/claude/streaming';
import { checkAndIncrementUsage } from '../utils/usage';
import { parseJsonResponse } from '../utils/json';
import prisma from '../prisma/client';

const router = Router();
router.use(authenticateToken);

// POST /api/claude/analyze - Analyze code with Claude
router.post('/analyze', async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, prompt, repositoryId } = req.body;

  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  try {
    const canProceed = await checkAndIncrementUsage(req.user!.id);
    if (!canProceed) {
      res.status(429).json({ error: 'Usage limit reached. Please upgrade your plan.' });
      return;
    }

    const client = getClaudeClient();
    const userMessage = code
      ? `Here is the code to analyze:\n\n${code}\n\nUser request: ${prompt}`
      : `User request: ${prompt}`;

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: CODE_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const result = parseJsonResponse(text) ?? {
      summary: 'Analysis complete',
      overallExplanation: text,
      fileChanges: [],
      suggestions: [],
    };

    const analysisRecord = await prisma.analysis.create({
      data: {
        userId: req.user!.id,
        repositoryId: repositoryId || null,
        prompt,
        result: result as object,
        status: 'completed',
      },
    });

    res.status(201).json({
      ...analysisRecord,
      result,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    });
  } catch (error) {
    console.error('Claude analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// GET /api/claude/suggestions - Get suggestions for stored analysis
router.get('/suggestions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { repositoryId } = req.query;

    const analyses = await prisma.analysis.findMany({
      where: {
        userId: req.user!.id,
        status: 'completed',
        ...(repositoryId ? { repositoryId: String(repositoryId) } : {}),
      },
      include: { repository: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const mapped = analyses.map(({ repository, ...a }) => ({
      ...a,
      repository_name: repository?.name ?? null,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// POST /api/claude/stream-analysis - Stream analysis results
router.post('/stream-analysis', async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, prompt } = req.body;

  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  try {
    const canProceed = await checkAndIncrementUsage(req.user!.id);
    if (!canProceed) {
      res.status(429).json({ error: 'Usage limit reached. Please upgrade your plan.' });
      return;
    }

    const userMessage = code
      ? `Here is the code to analyze:\n\n${code}\n\nUser request: ${prompt}`
      : `User request: ${prompt}`;

    await streamAnalysis(CODE_ANALYSIS_SYSTEM_PROMPT, userMessage, res);
  } catch (error) {
    console.error('Stream analysis error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream analysis failed' });
    }
  }
});

export default router;
