import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_ID_PRO || '',
  premium: process.env.STRIPE_PRICE_ID_PREMIUM || '',
};

export const PLAN_BY_PRICE_ID: Record<string, string> = {
  [process.env.STRIPE_PRICE_ID_PRO || '__pro__']: 'pro',
  [process.env.STRIPE_PRICE_ID_PREMIUM || '__premium__']: 'premium',
};

export async function createOrRetrieveCustomer(
  userId: string,
  email: string,
  name?: string,
  existingCustomerId?: string,
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });
  return customer.id;
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  baseUrl: string,
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    currency: 'gbp',
    success_url: `${baseUrl}/dashboard?subscription=success`,
    cancel_url: `${baseUrl}/pricing?subscription=cancelled`,
    metadata: { userId, priceId },
  });
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function retrieveSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export function constructWebhookEvent(
  payload: Buffer | string,
  signature: string,
  secret: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export default stripe;
