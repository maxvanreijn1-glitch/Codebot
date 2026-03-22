import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userDir = path.join(uploadDir, (req as unknown as AuthRequest).user!.id);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/', upload.array('files', 50) as any, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!name) {
    res.status(400).json({ error: 'Repository name is required' });
    return;
  }
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

    const repo = await prisma.repository.create({
      data: {
        userId: req.user!.id,
        name,
        description: description || null,
        filePath: repoDir,
        fileCount: files.length,
      },
    });

    res.status(201).json(repo);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload repository' });
  }
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const repos = await prisma.repository.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(repos);
  } catch (error) {
    console.error('List repos error:', error);
    res.status(500).json({ error: 'Failed to list repositories' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const repo = await prisma.repository.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    let files: string[] = [];
    if (repo.filePath && fs.existsSync(repo.filePath)) {
      files = fs.readdirSync(repo.filePath);
    }
    res.json({ ...repo, files });
  } catch (error) {
    console.error('Get repo error:', error);
    res.status(500).json({ error: 'Failed to get repository' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const repo = await prisma.repository.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!repo) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    if (repo.filePath && fs.existsSync(repo.filePath)) {
      fs.rmSync(repo.filePath, { recursive: true, force: true });
    }
    await prisma.repository.delete({ where: { id: repo.id } });
    res.json({ message: 'Repository deleted' });
  } catch (error) {
    console.error('Delete repo error:', error);
    res.status(500).json({ error: 'Failed to delete repository' });
  }
});

export default router;
