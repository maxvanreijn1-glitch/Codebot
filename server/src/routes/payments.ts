import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../prisma/client';
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
      features: ['5 analyses per month', 'Basic code analysis', 'Community support'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 20,
      currency: 'gbp',
      usageLimit: 50,
      features: ['50 analyses per month', 'Advanced code analysis', 'Diff viewer', 'Priority support'],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 100,
      currency: 'gbp',
      usageLimit: 1000,
      features: ['1000 analyses per month', 'Full AI analysis suite', 'Team collaboration', '24/7 support'],
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
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { stripeCustomerId: true, email: true, name: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.stripeCustomerId) {
      customerId = user.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: req.user!.id },
      });
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { stripeCustomerId: customer.id },
      });
      customerId = customer.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.amount,
      currency: plan.currency,
      customer: customerId,
      metadata: { userId: req.user!.id, tier },
    });

    await prisma.payment.create({
      data: {
        userId: req.user!.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: plan.amount,
        currency: plan.currency,
        tier,
        status: 'pending',
      },
    });

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

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { tier: tier as 'pro' | 'premium', usageLimit: plan.usageLimit },
    });
    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: 'succeeded' },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, tier: true, usageCount: true, usageLimit: true },
    });

    res.json({ success: true, user });
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
      await prisma.user.update({
        where: { id: userId },
        data: { tier: tier as 'pro' | 'premium', usageLimit: plan.usageLimit },
      });
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: 'succeeded' },
      });
    }
  }

  res.json({ received: true });
});

export default router;
