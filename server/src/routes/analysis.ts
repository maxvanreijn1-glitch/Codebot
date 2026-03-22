import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { analyzeCode } from '../utils/openai';
import { checkAndIncrementUsage } from '../utils/usage';

const router = Router();
router.use(authenticateToken);

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { repositoryId, prompt, code } = req.body;

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

    let codeContent = code || '';

    if (repositoryId && !code) {
      const repo = await prisma.repository.findFirst({
        where: { id: repositoryId, userId: req.user!.id },
      });
      if (repo?.filePath && fs.existsSync(repo.filePath)) {
        const files = fs.readdirSync(repo.filePath);
        const fileContents: string[] = [];
        for (const file of files.slice(0, 20)) {
          const filePath = path.join(repo.filePath, file);
          if (fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, 'utf-8');
            fileContents.push(`### File: ${file}\n\`\`\`\n${content}\n\`\`\``);
          }
        }
        codeContent = fileContents.join('\n\n');
      }
    }

    const analysis = await prisma.analysis.create({
      data: {
        userId: req.user!.id,
        repositoryId: repositoryId || null,
        prompt,
        status: 'processing',
      },
    });

    try {
      const result = await analyzeCode(codeContent, prompt);
      const updated = await prisma.analysis.update({
        where: { id: analysis.id },
        data: { result: result as object, status: 'completed' },
      });
      res.status(201).json({ ...updated, result, status: 'completed' });
    } catch (aiError) {
      await prisma.analysis.update({
        where: { id: analysis.id },
        data: { status: 'failed' },
      });
      console.error('AI analysis error:', aiError);
      res.status(500).json({ error: 'Analysis failed' });
    }
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to run analysis' });
  }
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const analyses = await prisma.analysis.findMany({
      where: { userId: req.user!.id },
      include: { repository: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const mapped = analyses.map(({ repository, ...a }) => ({
      ...a,
      repository_name: repository?.name ?? null,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('List analyses error:', error);
    res.status(500).json({ error: 'Failed to list analyses' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const analysis = await prisma.analysis.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { repository: { select: { name: true } } },
    });
    if (!analysis) {
      res.status(404).json({ error: 'Analysis not found' });
      return;
    }
    const { repository, ...rest } = analysis;
    res.json({ ...rest, repository_name: repository?.name ?? null });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ error: 'Failed to get analysis' });
  }
});

export default router;
