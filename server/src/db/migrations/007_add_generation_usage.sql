-- Add generation usage tracking columns and Stripe subscription columns to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS code_generation_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS circuit_generation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generation_reset_at     TIMESTAMP WITH TIME ZONE DEFAULT (date_trunc('month', NOW()) + interval '1 month'),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_failed          BOOLEAN NOT NULL DEFAULT FALSE;
