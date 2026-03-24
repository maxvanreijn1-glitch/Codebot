import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} from '../middleware/validation';

const router = Router();

const PASSWORD_RESET_EXPIRY_MINUTES = 30;

router.post('/register', validateRegister, async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;

  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    logger.warn('jwt_secret_missing', { event: 'register' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4) RETURNING id, email, name, tier, usage_count, usage_limit',
      [id, email, passwordHash, name]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, tier: user.tier },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    logger.info('auth_register', { userId: user.id, email });
    res.status(201).json({ token, user });
  } catch (error) {
    logger.error('auth_register_error', { message: (error as Error).message });
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', validateLogin, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, email, name, tier, usage_count, usage_limit, password_hash FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logger.warn('auth_login_failed', { email });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, tier: user.tier },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    const { password_hash: _password_hash, ...userWithoutPassword } = user;
    logger.info('auth_login_success', { userId: user.id, tier: user.tier });
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    logger.error('auth_login_error', { message: (error as Error).message });
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, tier, usage_count, usage_limit, stripe_customer_id, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('auth_me_error', { userId: req.user?.id, message: (error as Error).message });
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Generates a 30-minute password reset token and (in production) would email it to the user.
 * Always returns 200 to avoid email enumeration.
 */
router.post('/forgot-password', validateForgotPassword, async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Return 200 to avoid email enumeration
      res.json({ message: 'If that email is registered, a reset link has been sent' });
      return;
    }

    const userId = result.rows[0].id as string;

    // Generate a secure random token and store its hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [tokenHash, expiresAt, userId]
    );

    // In production, send rawToken via email. Here we log it server-side only.
    logger.info('auth_password_reset_requested', { userId, expiresAt });

    // NOTE: In a real deployment, send rawToken to the user's email here.
    // The token emitted in logs is intentionally not the hashed value stored in the DB.

    res.json({ message: 'If that email is registered, a reset link has been sent' });
  } catch (error) {
    logger.error('auth_forgot_password_error', { message: (error as Error).message });
    res.status(500).json({ error: 'Failed to process request' });
  }
});

/**
 * POST /api/auth/reset-password
 * Validates the reset token (unhashed comparison against stored hash) and updates the password.
 * Invalidates the token immediately after use.
 */
router.post('/reset-password', validateResetPassword, async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      'SELECT id, password_reset_expires FROM users WHERE password_reset_token = $1',
      [tokenHash]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid or expired reset token' });
      return;
    }

    const user = result.rows[0] as { id: string; password_reset_expires: Date | null };

    if (!user.password_reset_expires || new Date() > new Date(user.password_reset_expires)) {
      // Clear expired token
      await pool.query(
        'UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1',
        [user.id]
      );
      res.status(401).json({ error: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and immediately clear the reset token
    await pool.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    logger.info('auth_password_reset_success', { userId: user.id });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('auth_reset_password_error', { message: (error as Error).message });
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
