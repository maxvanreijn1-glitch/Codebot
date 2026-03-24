import { pool } from '../db';
import { PLAN_BY_PRICE_ID, retrieveSubscription } from './stripe.service';

export type SubscriptionPlan = 'free' | 'pro' | 'premium';
export type SubscriptionStatus = 'active' | 'cancelled' | 'pending';

export async function activateSubscription(
  userId: string,
  stripeSubscriptionId: string,
  priceId: string,
): Promise<void> {
  const plan: SubscriptionPlan = (PLAN_BY_PRICE_ID[priceId] as SubscriptionPlan) ?? 'pro';
  const sub = await retrieveSubscription(stripeSubscriptionId);

  await pool.query('BEGIN');
  try {
    await pool.query(
      `UPDATE users
         SET tier = $1,
             subscription_plan = $1,
             subscription_status = 'active',
             stripe_subscription_id = $2,
             payment_failed = FALSE
       WHERE id = $3`,
      [plan, stripeSubscriptionId, userId],
    );

    await pool.query(
      `INSERT INTO subscriptions
         (id, user_id, stripe_subscription_id, stripe_customer_id, plan, status,
          current_period_start, current_period_end, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', $5, $6, NOW(), NOW())
       ON CONFLICT (stripe_subscription_id)
       DO UPDATE SET
         plan = EXCLUDED.plan,
         status = 'active',
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         updated_at = NOW()`,
      [
        userId,
        stripeSubscriptionId,
        sub.customer as string,
        plan,
        new Date((sub.current_period_start as number) * 1000),
        new Date((sub.current_period_end as number) * 1000),
      ],
    );

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

export async function cancelSubscription(stripeCustomerId: string): Promise<void> {
  await pool.query(
    `UPDATE users
       SET tier = 'free',
           subscription_plan = 'free',
           subscription_status = 'cancelled',
           stripe_subscription_id = NULL
     WHERE stripe_customer_id = $1`,
    [stripeCustomerId],
  );

  await pool.query(
    `UPDATE subscriptions
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
     WHERE stripe_customer_id = $1`,
    [stripeCustomerId],
  );
}

export async function renewSubscription(
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  priceId: string,
): Promise<void> {
  const plan: SubscriptionPlan = (PLAN_BY_PRICE_ID[priceId] as SubscriptionPlan) ?? 'pro';
  const sub = await retrieveSubscription(stripeSubscriptionId);

  await pool.query(
    `UPDATE users
       SET tier = $1,
           subscription_plan = $1,
           subscription_status = 'active',
           stripe_subscription_id = $2,
           payment_failed = FALSE
     WHERE stripe_customer_id = $3`,
    [plan, stripeSubscriptionId, stripeCustomerId],
  );

  await pool.query(
    `UPDATE subscriptions
       SET status = 'active',
           plan = $1,
           current_period_start = $2,
           current_period_end = $3,
           updated_at = NOW()
     WHERE stripe_subscription_id = $4`,
    [
      plan,
      new Date((sub.current_period_start as number) * 1000),
      new Date((sub.current_period_end as number) * 1000),
      stripeSubscriptionId,
    ],
  );
}

export async function flagPaymentFailure(stripeCustomerId: string): Promise<{ email: string; name?: string } | null> {
  const result = await pool.query(
    `UPDATE users
       SET payment_failed = TRUE
     WHERE stripe_customer_id = $1
     RETURNING email, name`,
    [stripeCustomerId],
  );
  if (!result.rows[0]?.email) return null;
  return { email: result.rows[0].email, name: result.rows[0].name ?? undefined };
}
