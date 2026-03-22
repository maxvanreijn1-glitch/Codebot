import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { commandExecutor, CommandType } from '../services/local-repo/commands';
import prisma from '../prisma/client';

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

    const logs = await prisma.commandLog.findMany({
      where: {
        userId: req.user!.id,
        ...(repositoryId ? { repositoryId: String(repositoryId) } : {}),
      },
      include: { repository: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const mapped = logs.map(({ repository, ...l }) => ({
      ...l,
      repository_name: repository?.name ?? null,
    }));
    res.json(mapped);
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
