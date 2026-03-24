import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { logger } from '../utils/logger';
import { AuthRequest } from './auth';

// Daily request limits per subscription tier (inspired by ChatGPT/Claude limits)
export const TIER_RATE_LIMITS: Record<string, number> = {
  free: 50,
  pro: 500,
  premium: 5000,
};

// Fallback per-IP rate limit (requests per 15 minutes) for unauthenticated paths
const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_REQUESTS = 100;
const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

// Periodically purge expired IP entries to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRequestMap.entries()) {
    if (now > entry.resetAt) {
      ipRequestMap.delete(ip);
    }
  }
}, IP_WINDOW_MS);

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? 'unknown';
}

/**
 * Subscription-tier based rate limiter.
 * Requires authenticateToken to have run first.
 * Counts API calls against the user's daily usage_count in the database.
 */
export async function tierRateLimiter(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    // No authenticated user – fall through to IP limiter
    ipRateLimiter(req, res, next);
    return;
  }

  try {
    const result = await pool.query(
      'SELECT tier, usage_count, usage_limit FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const { tier, usage_count, usage_limit } = result.rows[0] as {
      tier: string;
      usage_count: number;
      usage_limit: number;
    };

    const dailyLimit = TIER_RATE_LIMITS[tier] ?? (() => {
      logger.warn('unknown_tier_rate_limit', { userId: req.user!.id, tier, fallback: usage_limit });
      return usage_limit as number;
    })();

    if (usage_count >= dailyLimit) {
      // Midnight UTC reset time
      const now = new Date();
      const resetAt = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
      );
      const retryAfterSeconds = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);

      logger.warn('rate_limit_exceeded', {
        userId: req.user.id,
        tier,
        usageCount: usage_count,
        dailyLimit,
      });

      res
        .status(429)
        .set('Retry-After', String(retryAfterSeconds))
        .json({
          error: 'Rate limit exceeded',
          limit: dailyLimit,
          remaining: 0,
          resetAt: resetAt.toISOString(),
        });
      return;
    }

    next();
  } catch (error) {
    logger.error('rate_limiter_error', { error: String(error) });
    next(error);
  }
}

/**
 * IP-based fallback rate limiter (100 requests per 15 minutes).
 * Used for unauthenticated routes or as backup.
 */
export function ipRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const now = Date.now();

  const entry = ipRequestMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequestMap.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    next();
    return;
  }

  entry.count += 1;

  if (entry.count > IP_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    res
      .status(429)
      .set('Retry-After', String(retryAfterSeconds))
      .json({
        error: 'Too many requests, please try again later',
        retryAfter: retryAfterSeconds,
      });
    return;
  }

  next();
}
