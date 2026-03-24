import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { checkAndIncrementGenerationUsage, GenerationType } from '../services/usage.service';

/**
 * Factory that returns Express middleware to check and increment generation usage.
 * On limit exceeded responds 429 with upgrade prompt data.
 */
export function checkUsageLimit(type: GenerationType) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const tier = req.user?.tier ?? 'free';
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const { allowed, remaining } = await checkAndIncrementGenerationUsage(
        userId,
        type,
        tier,
      );

      if (!allowed) {
        res.status(429).json({
          error: `${type === 'code' ? 'Code' : 'Circuit'} generation limit reached for your ${tier} plan.`,
          limitReached: true,
          type,
          tier,
          upgradeUrl: '/pricing',
        });
        return;
      }

      // Attach remaining count for the route handler to include in its response
      (req as AuthRequest & { generationRemaining?: number }).generationRemaining = remaining;
      next();
    } catch (err) {
      console.error('checkUsageLimit error:', err);
      res.status(500).json({ error: 'Usage check failed' });
    }
  };
}
