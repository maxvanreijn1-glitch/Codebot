import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prManager } from '../services/pull-request/manager';
import { prMerger } from '../services/pull-request/merger';
import { prDiffer } from '../services/pull-request/differ';

const router = Router();
router.use(authenticateToken);

// GET /api/pull-requests - List all PRs
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { repositoryId } = req.query;
    const prs = await prManager.listPRs(req.user!.id, repositoryId as string | undefined);
    res.json(prs);
  } catch (error) {
    console.error('List PRs error:', error);
    res.status(500).json({ error: 'Failed to list pull requests' });
  }
});

// POST /api/pull-requests - Create new PR
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { repositoryId, title, description, fileChanges } = req.body;

  if (!repositoryId || !title || !fileChanges) {
    res.status(400).json({ error: 'repositoryId, title, and fileChanges are required' });
    return;
  }

  try {
    const pr = await prManager.createPR(
      req.user!.id,
      repositoryId,
      title,
      description || '',
      fileChanges
    );
    res.status(201).json(pr);
  } catch (error) {
    console.error('Create PR error:', error);
    res.status(500).json({ error: 'Failed to create pull request' });
  }
});

// GET /api/pull-requests/:id - Get PR details
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pr = await prManager.getPR(req.params.id, req.user!.id);
    if (!pr) {
      res.status(404).json({ error: 'Pull request not found' });
      return;
    }

    // Generate diffs for each file change
    const diffs = pr.fileChanges.map(fc => prDiffer.generateDiff(fc.path, fc.original, fc.modified));
    res.json({ ...pr, diffs });
  } catch (error) {
    console.error('Get PR error:', error);
    res.status(500).json({ error: 'Failed to get pull request' });
  }
});

// PATCH /api/pull-requests/:id - Update PR
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, status } = req.body;

  try {
    const pr = await prManager.updatePR(req.params.id, req.user!.id, { title, description, status });
    if (!pr) {
      res.status(404).json({ error: 'Pull request not found' });
      return;
    }
    res.json(pr);
  } catch (error) {
    console.error('Update PR error:', error);
    res.status(500).json({ error: 'Failed to update pull request' });
  }
});

// POST /api/pull-requests/:id/merge - Merge PR
router.post('/:id/merge', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await prMerger.mergePR(req.params.id, req.user!.id);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Merge PR error:', error);
    res.status(500).json({ error: 'Failed to merge pull request' });
  }
});

// DELETE /api/pull-requests/:id - Delete/close PR
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deleted = await prManager.deletePR(req.params.id, req.user!.id);
    if (!deleted) {
      res.status(404).json({ error: 'Pull request not found' });
      return;
    }
    res.json({ message: 'Pull request deleted' });
  } catch (error) {
    console.error('Delete PR error:', error);
    res.status(500).json({ error: 'Failed to delete pull request' });
  }
});

export default router;
