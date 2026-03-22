import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { localRepoManager } from '../services/local-repo/manager';
import { repoScanner } from '../services/local-repo/scanner';
import { fileWatcher } from '../services/local-repo/watcher';

const router = Router();
router.use(authenticateToken);

// GET /api/repos - List local repositories
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const repos = await localRepoManager.listRepos(req.user!.id);
    res.json(repos);
  } catch (error) {
    console.error('List repos error:', error);
    res.status(500).json({ error: 'Failed to list repositories' });
  }
});

// POST /api/repos - Register new local repository
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Repository name is required' });
    return;
  }

  try {
    const repo = await localRepoManager.createRepo(req.user!.id, name, description);
    fileWatcher.watchRepo(repo.id, repo.localPath);
    res.status(201).json(repo);
  } catch (error) {
    console.error('Create repo error:', error);
    res.status(500).json({ error: 'Failed to create repository' });
  }
});

// GET /api/repos/:id - Get repo details
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const repo = await localRepoManager.getRepo(req.params.id, req.user!.id);
    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    const files = localRepoManager.scanFiles(repo.localPath);
    res.json({ ...repo, files: files.map(f => ({ path: f.path, name: f.name, size: f.size })) });
  } catch (error) {
    console.error('Get repo error:', error);
    res.status(500).json({ error: 'Failed to get repository' });
  }
});

// POST /api/repos/:id/scan - Scan and index repository
router.post('/:id/scan', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const repo = await localRepoManager.getRepo(req.params.id, req.user!.id);
    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    const index = repoScanner.scanAndIndex(repo.localPath);
    await localRepoManager.updateSyncStatus(repo.id);

    res.json({
      repositoryId: repo.id,
      totalFiles: index.totalFiles,
      totalLines: index.totalLines,
      languages: index.languages,
      indexedAt: index.indexedAt,
    });
  } catch (error) {
    console.error('Scan repo error:', error);
    res.status(500).json({ error: 'Failed to scan repository' });
  }
});

// GET /api/repos/:id/status - Get repository status
router.get('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = await localRepoManager.getRepoStatus(req.params.id, req.user!.id);
    res.json(status);
  } catch (error) {
    console.error('Repo status error:', error);
    if (error instanceof Error && error.message === 'Repository not found') {
      res.status(404).json({ error: 'Repository not found' });
    } else {
      res.status(500).json({ error: 'Failed to get repository status' });
    }
  }
});

// DELETE /api/repos/:id - Delete repository
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    fileWatcher.unwatchRepo(req.params.id);
    const deleted = await localRepoManager.deleteRepo(req.params.id, req.user!.id);
    if (!deleted) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    res.json({ message: 'Repository deleted' });
  } catch (error) {
    console.error('Delete repo error:', error);
    res.status(500).json({ error: 'Failed to delete repository' });
  }
});

export default router;
