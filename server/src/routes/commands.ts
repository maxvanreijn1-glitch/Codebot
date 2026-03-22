import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { commandExecutor, CommandType } from '../services/local-repo/commands';
import { pool } from '../db';

const router = Router();
router.use(authenticateToken);

const VALID_COMMANDS: CommandType[] = [
  'repo:pull',
  'repo:push',
  'repo:sync',
  'repo:status',
  'repo:analyze',
  'pr:create',
  'pr:merge',
];

// POST /api/commands/execute - Execute custom command
router.post('/execute', async (req: AuthRequest, res: Response): Promise<void> => {
  const { command, repositoryId, params } = req.body;

  if (!command) {
    res.status(400).json({ error: 'Command is required' });
    return;
  }

  if (!VALID_COMMANDS.includes(command as CommandType)) {
    res.status(400).json({
      error: `Invalid command. Valid commands: ${VALID_COMMANDS.join(', ')}`,
    });
    return;
  }

  if (!repositoryId) {
    res.status(400).json({ error: 'repositoryId is required' });
    return;
  }

  try {
    const result = await commandExecutor.execute({
      type: command as CommandType,
      repoId: repositoryId,
      userId: req.user!.id,
      params: params || {},
    });

    res.json(result);
  } catch (error) {
    console.error('Command execution error:', error);
    res.status(500).json({ error: 'Command execution failed' });
  }
});

// GET /api/commands/history - Command execution history
router.get('/history', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { repositoryId } = req.query;
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 100) : 50;

    let query = `SELECT cl.*, lr.name as repository_name
                 FROM command_logs cl
                 LEFT JOIN local_repositories lr ON cl.repository_id = lr.id
                 WHERE cl.user_id = $1`;
    const params: unknown[] = [req.user!.id];

    if (repositoryId) {
      query += ' AND cl.repository_id = $2';
      params.push(repositoryId);
    }

    query += ` ORDER BY cl.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Command history error:', error);
    res.status(500).json({ error: 'Failed to get command history' });
  }
});

// POST /api/commands/validate - Validate command syntax
router.post('/validate', (req: AuthRequest, res: Response): void => {
  const { command, params } = req.body;

  if (!command) {
    res.status(400).json({ valid: false, error: 'Command is required' });
    return;
  }

  if (!VALID_COMMANDS.includes(command as CommandType)) {
    res.json({
      valid: false,
      error: `Unknown command: ${command}`,
      availableCommands: VALID_COMMANDS,
    });
    return;
  }

  const validationErrors: string[] = [];

  if (command === 'pr:create') {
    const p = params as { title?: string; files?: unknown[] } | undefined;
    if (!p?.title) validationErrors.push('params.title is required for pr:create');
    if (!p?.files?.length) validationErrors.push('params.files is required for pr:create');
  }

  if (command === 'pr:merge') {
    const p = params as { prId?: string } | undefined;
    if (!p?.prId) validationErrors.push('params.prId is required for pr:merge');
  }

  if (command === 'repo:push') {
    const p = params as { files?: unknown[] } | undefined;
    if (!p?.files?.length) validationErrors.push('params.files is required for repo:push');
  }

  if (validationErrors.length > 0) {
    res.json({ valid: false, errors: validationErrors });
    return;
  }

  res.json({ valid: true, command, availableCommands: VALID_COMMANDS });
});

export default router;
