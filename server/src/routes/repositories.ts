import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateRepositoryCreate } from '../middleware/validation';
import { logger } from '../utils/logger';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userDir = path.join(uploadDir, (req as AuthRequest).user!.id);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 50 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rb', '.php', '.cs', '.cpp', '.c', '.h', '.json', '.md', '.txt', '.yaml', '.yml', '.toml', '.html', '.css', '.scss', '.sql', '.sh', '.bash'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.originalname.endsWith('.example')) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

const router = Router();
router.use(authenticateToken);

router.post('/', upload.array('files', 50), validateRepositoryCreate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    res.status(400).json({ error: 'At least one file is required' });
    return;
  }

  try {
    const repoDir = path.join(uploadDir, req.user!.id, `repo-${Date.now()}`);
    fs.mkdirSync(repoDir, { recursive: true });

    for (const file of files) {
      const dest = path.join(repoDir, file.originalname);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(file.path, dest);
    }

    const result = await pool.query(
      'INSERT INTO repositories (user_id, name, description, file_path, file_count) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user!.id, name, description || null, repoDir, files.length]
    );

    logger.info('repository_created', { userId: req.user!.id, repositoryId: result.rows[0].id });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('repository_upload_error', { userId: req.user!.id, message: (error as Error).message });
    res.status(500).json({ error: 'Failed to upload repository' });
  }
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM repositories WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('list_repos_error', { userId: req.user!.id, message: (error as Error).message });
    res.status(500).json({ error: 'Failed to list repositories' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM repositories WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    const repo = result.rows[0];
    let files: string[] = [];
    if (repo.file_path && fs.existsSync(repo.file_path)) {
      files = fs.readdirSync(repo.file_path);
    }
    res.json({ ...repo, files });
  } catch (error) {
    logger.error('get_repo_error', { userId: req.user!.id, message: (error as Error).message });
    res.status(500).json({ error: 'Failed to get repository' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM repositories WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    const repo = result.rows[0];
    if (repo.file_path && fs.existsSync(repo.file_path)) {
      fs.rmSync(repo.file_path, { recursive: true, force: true });
    }
    await pool.query('DELETE FROM repositories WHERE id = $1', [repo.id]);
    logger.info('repository_deleted', { userId: req.user!.id, repositoryId: repo.id });
    res.json({ message: 'Repository deleted' });
  } catch (error) {
    logger.error('delete_repo_error', { userId: req.user!.id, message: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete repository' });
  }
});

export default router;
