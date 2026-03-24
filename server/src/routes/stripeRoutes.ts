import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_ID_PRO || '',
  premium: process.env.STRIPE_PRICE_ID_PREMIUM || '',
};

const PLAN_TIERS: Record<string, string> = {
  [process.env.STRIPE_PRICE_ID_PRO || '__pro__']: 'pro',
  [process.env.STRIPE_PRICE_ID_PREMIUM || '__premium__']: 'premium',
};

const router = Router();

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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

    let customerId: string = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId: req.user!.id },
      });
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [
        customer.id,
        req.user!.id,
      ]);
      customerId = customer.id;
    }

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      currency: 'gbp',
      success_url: `${baseUrl}/dashboard?subscription=success`,
      cancel_url: `${baseUrl}/pricing?subscription=cancelled`,
      metadata: { userId: req.user!.id, priceId },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/stripe/webhook
router.post('/webhook', express_raw_body_middleware, async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
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
        if (userId && priceId) {
          const tier = PLAN_TIERS[priceId] ?? 'pro';
          await pool.query(
            `UPDATE users SET tier = $1, stripe_subscription_id = $2 WHERE id = $3`,
            [tier, session.subscription as string, userId],
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await pool.query(
          `UPDATE users SET tier = 'free', stripe_subscription_id = NULL
           WHERE stripe_customer_id = $1`,
          [sub.customer as string],
        );
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        // Subscription renewed – ensure tier is still set
        const custId = invoice.customer as string;
        const subId = invoice.subscription;
        if (custId && subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const priceId = sub.items.data[0]?.price.id;
          const tier = priceId ? (PLAN_TIERS[priceId] ?? 'pro') : 'pro';
          await pool.query(
            `UPDATE users SET tier = $1, stripe_subscription_id = $2
             WHERE stripe_customer_id = $3`,
            [tier, subId, custId],
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const custId = invoice.customer as string;
        if (custId) {
          // Flag the account but don't immediately downgrade
          await pool.query(
            `UPDATE users SET payment_failed = TRUE WHERE stripe_customer_id = $1`,
            [custId],
          );
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    // Still return 200 so Stripe doesn't retry
  }

  res.json({ received: true });
});

// GET /api/stripe/portal – redirect to Stripe Customer Portal
router.get('/portal', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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
    const session = await stripe.billingPortal.sessions.create({
      customer: userResult.rows[0].stripe_customer_id,
      return_url: `${baseUrl}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// This middleware is applied per-route for the webhook only
function express_raw_body_middleware(req: Request, _res: Response, next: () => void): void {
  // Body is already buffered as raw by the express.raw() middleware registered in index.ts
  next();
}

export default router;
