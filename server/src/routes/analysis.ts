import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { pool } from '../db';
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
      const repoResult = await pool.query(
        'SELECT * FROM repositories WHERE id = $1 AND user_id = $2',
        [repositoryId, req.user!.id]
      );
      if (repoResult.rows.length > 0) {
        const repo = repoResult.rows[0];
        if (repo.file_path && fs.existsSync(repo.file_path)) {
          const files = fs.readdirSync(repo.file_path);
          const fileContents: string[] = [];
          for (const file of files.slice(0, 20)) {
            const filePath = path.join(repo.file_path, file);
            if (fs.statSync(filePath).isFile()) {
              const content = fs.readFileSync(filePath, 'utf-8');
              fileContents.push(`### File: ${file}\n\`\`\`\n${content}\n\`\`\``);
            }
          }
          codeContent = fileContents.join('\n\n');
        }
      }
    }

    const analysisResult = await pool.query(
      'INSERT INTO analyses (user_id, repository_id, prompt, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user!.id, repositoryId || null, prompt, 'processing']
    );
    const analysis = analysisResult.rows[0];

    try {
      const result = await analyzeCode(codeContent, prompt);
      await pool.query(
        'UPDATE analyses SET result = $1, status = $2 WHERE id = $3',
        [JSON.stringify(result), 'completed', analysis.id]
      );
      res.status(201).json({ ...analysis, result, status: 'completed' });
    } catch (aiError) {
      await pool.query(
        'UPDATE analyses SET status = $1 WHERE id = $2',
        ['failed', analysis.id]
      );
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
    const result = await pool.query(
      `SELECT a.*, r.name as repository_name 
       FROM analyses a 
       LEFT JOIN repositories r ON a.repository_id = r.id 
       WHERE a.user_id = $1 
       ORDER BY a.created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List analyses error:', error);
    res.status(500).json({ error: 'Failed to list analyses' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT a.*, r.name as repository_name 
       FROM analyses a 
       LEFT JOIN repositories r ON a.repository_id = r.id 
       WHERE a.id = $1 AND a.user_id = $2`,
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Analysis not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ error: 'Failed to get analysis' });
  }
});

export default router;
