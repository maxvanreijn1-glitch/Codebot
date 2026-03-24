-- Migration 005: Add additional security indexes
-- These supplement the indexes already in schema.sql

-- Users table: fast email lookup (authentication) and tier-based queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Repositories: composite index for the common (user_id, created_at) pattern
CREATE INDEX IF NOT EXISTS idx_repositories_user_id_created_at ON repositories(user_id, created_at DESC);

-- Analyses: composite index for (user_id, created_at) and (repository_id, user_id) JOIN pattern
CREATE INDEX IF NOT EXISTS idx_analyses_user_id_created_at ON analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_repository_id_user_id ON analyses(repository_id, user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);

-- Payments: user_id + created_at for history queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id_created_at ON payments(user_id, created_at DESC);

-- Local repositories
CREATE INDEX IF NOT EXISTS idx_local_repositories_user_id_status ON local_repositories(user_id, status);
