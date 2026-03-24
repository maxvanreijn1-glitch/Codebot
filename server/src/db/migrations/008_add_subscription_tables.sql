-- Add subscription_plan and subscription_status columns to users table
-- Add subscriptions and usage_logs tables for full subscription management

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_plan   VARCHAR(20) NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Sync subscription_plan with existing tier values for non-free users
UPDATE users SET subscription_plan = tier WHERE tier != 'free';

CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id    VARCHAR(255) NOT NULL,
  plan                  VARCHAR(20) NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'active',
  current_period_start  TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end    TIMESTAMP WITH TIME ZONE NOT NULL,
  cancelled_at          TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
