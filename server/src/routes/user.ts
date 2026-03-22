import { Router, Response } from 'express';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, tier, usage_count, usage_limit, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.put('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, tier, usage_count, usage_limit',
      [name.trim(), req.user!.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/usage', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT tier, usage_count, usage_limit FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const user = result.rows[0];
    res.json({
      tier: user.tier,
      usageCount: user.usage_count,
      usageLimit: user.usage_limit,
      remaining: user.usage_limit - user.usage_count,
      percentage: Math.round((user.usage_count / user.usage_limit) * 100),
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

export default router;
