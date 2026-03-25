/**
 * Circuit API Routes
 *
 * POST /api/circuit/parse-code    – Arduino code → circuit graph
 * POST /api/circuit/generate-code – circuit graph → Arduino sketch
 * POST /api/circuit/validate      – validate circuit graph
 * POST /api/circuit/render        – circuit graph → render graph (with positions/styles)
 * GET  /api/circuit/saved         – list saved circuits for the authenticated user
 * POST /api/circuit/save          – save a circuit
 * GET  /api/circuit/saved/:id     – load a single saved circuit
 * DELETE /api/circuit/saved/:id   – delete a saved circuit
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { checkUsageLimit } from '../middleware/checkUsageLimits';
import { parseArduinoCode } from '../modules/circuitParser';
import { generateArduinoCode } from '../modules/circuitGenerator';
import { validateCircuit } from '../modules/circuitValidator';
import { buildRenderGraph } from '../modules/circuitRenderer';
import { pool } from '../db';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticateToken);

// ── POST /api/circuit/parse-code ─────────────────────────────────────────────
router.post(
  '/parse-code',
  checkUsageLimit('circuit'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { code } = req.body as { code?: string };
    if (!code || typeof code !== 'string' || !code.trim()) {
      res.status(400).json({ error: 'code is required' });
      return;
    }

    try {
      const graph = parseArduinoCode(code);
      const renderGraph = buildRenderGraph(graph);
      logger.info('circuit_parse_code', { userId: req.user!.id, components: graph.components.length });
      res.json({ graph, renderGraph });
    } catch (err) {
      logger.error('circuit_parse_code_error', { message: (err as Error).message });
      res.status(500).json({ error: 'Failed to parse code' });
    }
  },
);

// ── POST /api/circuit/generate-code ──────────────────────────────────────────
router.post(
  '/generate-code',
  checkUsageLimit('circuit'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { graph } = req.body as { graph?: unknown };
    if (!graph || typeof graph !== 'object') {
      res.status(400).json({ error: 'graph is required' });
      return;
    }

    try {
      const result = generateArduinoCode(graph as Parameters<typeof generateArduinoCode>[0]);
      logger.info('circuit_generate_code', { userId: req.user!.id });
      res.json(result);
    } catch (err) {
      logger.error('circuit_generate_code_error', { message: (err as Error).message });
      res.status(500).json({ error: 'Failed to generate code' });
    }
  },
);

// ── POST /api/circuit/validate ────────────────────────────────────────────────
router.post('/validate', async (req: AuthRequest, res: Response): Promise<void> => {
  const { graph } = req.body as { graph?: unknown };
  if (!graph || typeof graph !== 'object') {
    res.status(400).json({ error: 'graph is required' });
    return;
  }

  try {
    const result = validateCircuit(graph as Parameters<typeof validateCircuit>[0]);
    res.json(result);
  } catch (err) {
    logger.error('circuit_validate_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Validation failed' });
  }
});

// ── POST /api/circuit/render ──────────────────────────────────────────────────
router.post('/render', async (req: AuthRequest, res: Response): Promise<void> => {
  const { graph } = req.body as { graph?: unknown };
  if (!graph || typeof graph !== 'object') {
    res.status(400).json({ error: 'graph is required' });
    return;
  }

  try {
    const renderGraph = buildRenderGraph(graph as Parameters<typeof buildRenderGraph>[0]);
    res.json(renderGraph);
  } catch (err) {
    logger.error('circuit_render_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Render failed' });
  }
});

// ── GET /api/circuit/saved ────────────────────────────────────────────────────
router.get('/saved', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, created_at, updated_at FROM circuits WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user!.id],
    );
    res.json(result.rows);
  } catch (err) {
    logger.error('circuit_list_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Failed to list circuits' });
  }
});

// ── POST /api/circuit/save ────────────────────────────────────────────────────
router.post('/save', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, graph, code } = req.body as {
    name?: string;
    description?: string;
    graph?: unknown;
    code?: string;
  };

  if (!name || !graph) {
    res.status(400).json({ error: 'name and graph are required' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO circuits (user_id, name, description, graph_data, arduino_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, created_at, updated_at`,
      [req.user!.id, name, description ?? null, JSON.stringify(graph), code ?? null],
    );
    logger.info('circuit_save', { userId: req.user!.id, circuitId: result.rows[0].id });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('circuit_save_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Failed to save circuit' });
  }
});

// ── GET /api/circuit/saved/:id ────────────────────────────────────────────────
router.get('/saved/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM circuits WHERE id = $1 AND user_id = $2',
      [id, req.user!.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: 'Circuit not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('circuit_load_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Failed to load circuit' });
  }
});

// ── DELETE /api/circuit/saved/:id ─────────────────────────────────────────────
router.delete('/saved/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM circuits WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: 'Circuit not found' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    logger.error('circuit_delete_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Failed to delete circuit' });
  }
});

export default router;
