import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  createOrRetrieveCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  constructWebhookEvent,
  PRICE_IDS,
  retrieveSubscription,
} from '../services/stripe.service';
import {
  activateSubscription,
  cancelSubscription,
  renewSubscription,
  flagPaymentFailure,
} from '../services/subscription.service';
import { sendPaymentFailedEmail } from '../utils/email';

const router = Router();

// POST /api/stripe/create-checkout-session
router.post(
  '/create-checkout-session',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { priceId } = req.body as { priceId: string };
    if (!priceId) {
      res.status(400).json({ error: 'priceId is required' });
      return;
    }

    const validPriceIds = Object.values(PRICE_IDS).filter(Boolean);
    if (validPriceIds.length && !validPriceIds.includes(priceId)) {
      res.status(400).json({ error: 'Invalid priceId' });
      return;
    }

    try {
      const userResult = await pool.query(
        'SELECT email, name, stripe_customer_id FROM users WHERE id = $1',
        [req.user!.id],
      );
      if (!userResult.rows.length) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const user = userResult.rows[0];

      const customerId = await createOrRetrieveCustomer(
        req.user!.id,
        user.email,
        user.name ?? undefined,
        user.stripe_customer_id ?? undefined,
      );

      if (!user.stripe_customer_id) {
        await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [
          customerId,
          req.user!.id,
        ]);
      }

      const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const session = await createCheckoutSession(customerId, priceId, req.user!.id, baseUrl);

      res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error('Create checkout session error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  },
);

// POST /api/stripe/webhook
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || '',
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const priceId = session.metadata?.priceId;
        if (userId && priceId && session.subscription) {
          await activateSubscription(userId, session.subscription as string, priceId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await cancelSubscription(sub.customer as string);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        const custId = invoice.customer as string;
        const subId = invoice.subscription;
        if (custId && subId) {
          const sub = await retrieveSubscription(subId);
          const priceId = sub.items.data[0]?.price.id ?? '';
          await renewSubscription(custId, subId, priceId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const custId = invoice.customer as string;
        if (custId) {
          const user = await flagPaymentFailure(custId);
          if (user) {
            await sendPaymentFailedEmail({ to: user.email, name: user.name });
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    // Return 200 so Stripe does not retry
  }

  res.json({ received: true });
});

// GET /api/stripe/portal — redirect to Stripe Customer Portal
router.get(
  '/portal',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userResult = await pool.query(
        'SELECT stripe_customer_id FROM users WHERE id = $1',
        [req.user!.id],
      );
      if (!userResult.rows.length || !userResult.rows[0].stripe_customer_id) {
        res.status(404).json({ error: 'No Stripe customer found. Subscribe first.' });
        return;
      }

      const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const session = await createBillingPortalSession(
        userResult.rows[0].stripe_customer_id,
        `${baseUrl}/dashboard`,
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error('Stripe portal error:', error);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  },
);

// GET /api/stripe/subscription — get current user subscription info
router.get(
  '/subscription',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await pool.query(
        `SELECT tier, subscription_plan, subscription_status, payment_failed,
                code_generation_count, circuit_generation_count
           FROM users WHERE id = $1`,
        [req.user!.id],
      );
      if (!result.rows.length) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({ error: 'Failed to get subscription info' });
    }
  },
);

export default router;
