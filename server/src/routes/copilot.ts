import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { copilotAnalyzer } from '../services/copilot/analyzer';
import { copilotSuggester } from '../services/copilot/suggester';
import { copilotContextManager } from '../services/copilot/context';
import { localRepoManager } from '../services/local-repo/manager';
import { checkAndIncrementUsage } from '../utils/usage';

const router = Router();
router.use(authenticateToken);

// POST /api/copilot/analyze-file - Analyze single file
router.post('/analyze-file', async (req: AuthRequest, res: Response): Promise<void> => {
  const { filename, content, language, repositoryId } = req.body;

  if (!filename || !content) {
    res.status(400).json({ error: 'filename and content are required' });
    return;
  }

  try {
    const canProceed = await checkAndIncrementUsage(req.user!.id);
    if (!canProceed) {
      res.status(429).json({ error: 'Usage limit reached. Please upgrade your plan.' });
      return;
    }

    let contextSummary: string | undefined;
    if (repositoryId) {
      const repo = await localRepoManager.getRepo(repositoryId, req.user!.id);
      if (repo) {
        const context = copilotContextManager.buildContextForFile(repo.localPath, filename);
        contextSummary = copilotContextManager.buildContextSummary(context);
      }
    }

    const result = await copilotAnalyzer.analyzeFile(
      filename,
      contextSummary ? `${contextSummary}\n\nTarget file content:\n${content}` : content,
      language || filename.split('.').pop() || 'unknown'
    );

    res.json(result);
  } catch (error) {
    console.error('Copilot analyze-file error:', error);
    res.status(500).json({ error: 'File analysis failed' });
  }
});

// POST /api/copilot/suggest - Generate suggestions
router.post('/suggest', async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, filename, language, context } = req.body;

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

    const result = await copilotSuggester.generateSuggestions({
      code,
      filename,
      language,
      context,
    });

    res.json(result);
  } catch (error) {
    console.error('Copilot suggest error:', error);
    res.status(500).json({ error: 'Suggestion generation failed' });
  }
});

export default router;
