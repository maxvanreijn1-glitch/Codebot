import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const PLANS = {
  pro: { amount: 2000, currency: 'gbp', tier: 'pro', name: 'Pro Plan', usageLimit: 50 },
  premium: { amount: 10000, currency: 'gbp', tier: 'premium', name: 'Premium Plan', usageLimit: 1000 },
};

const router = Router();

router.get('/plans', (_req: Request, res: Response) => {
  res.json([
    {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'gbp',
      usageLimit: 5,
      features: [
        '10 AI code generations/month',
        '5 circuit generations/month',
        'Basic code analysis',
        'Community support',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 20,
      currency: 'gbp',
      usageLimit: 100,
      features: [
        '100 AI code generations/month',
        '50 circuit generations/month',
        'Advanced code analysis',
        'Diff viewer',
        'Priority support',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 100,
      currency: 'gbp',
      usageLimit: -1,
      features: [
        'Unlimited AI code generations',
        'Unlimited circuit generations',
        'Priority API access',
        'Full AI analysis suite',
        '24/7 support',
      ],
    },
  ]);
});

router.post('/create-intent', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { tier } = req.body;
  const plan = PLANS[tier as keyof typeof PLANS];
  if (!plan) {
    res.status(400).json({ error: 'Invalid tier' });
    return;
  }

  try {
    let customerId: string | undefined = undefined;
    const userResult = await pool.query('SELECT stripe_customer_id, email, name FROM users WHERE id = $1', [req.user!.id]);
    const user = userResult.rows[0];

    if (user.stripe_customer_id) {
      customerId = user.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: req.user!.id },
      });
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customer.id, req.user!.id]);
      customerId = customer.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.amount,
      currency: plan.currency,
      customer: customerId,
      metadata: { userId: req.user!.id, tier },
    });

    await pool.query(
      'INSERT INTO payments (user_id, stripe_payment_intent_id, amount, currency, tier, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user!.id, paymentIntent.id, plan.amount, plan.currency, tier, 'pending']
    );

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    console.error('Create intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

router.post('/confirm', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { paymentIntentId } = req.body;
  if (!paymentIntentId) {
    res.status(400).json({ error: 'Payment intent ID required' });
    return;
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      res.status(400).json({ error: 'Payment not succeeded' });
      return;
    }

    const tier = intent.metadata.tier as keyof typeof PLANS;
    const plan = PLANS[tier];
    if (!plan) {
      res.status(400).json({ error: 'Invalid tier in payment' });
      return;
    }

    await pool.query(
      'UPDATE users SET tier = $1, usage_limit = $2 WHERE id = $3',
      [tier, plan.usageLimit, req.user!.id]
    );
    await pool.query(
      'UPDATE payments SET status = $1 WHERE stripe_payment_intent_id = $2',
      ['succeeded', paymentIntentId]
    );

    const userResult = await pool.query(
      'SELECT id, email, name, tier, usage_count, usage_limit FROM users WHERE id = $1',
      [req.user!.id]
    );

    res.json({ success: true, user: userResult.rows[0] });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const userId = intent.metadata.userId;
    const tier = intent.metadata.tier as keyof typeof PLANS;
    const plan = PLANS[tier];

    if (userId && plan) {
      await pool.query(
        'UPDATE users SET tier = $1, usage_limit = $2 WHERE id = $3',
        [tier, plan.usageLimit, userId]
      );
      await pool.query(
        'UPDATE payments SET status = $1 WHERE stripe_payment_intent_id = $2',
        ['succeeded', intent.id]
      );
    }
  }

  res.json({ received: true });
});

export default router;
