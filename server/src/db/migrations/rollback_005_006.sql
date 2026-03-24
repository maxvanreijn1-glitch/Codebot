-- Rollback for migrations 005 and 006
-- Run this script to undo the changes introduced in 005_add_security_indexes.sql
-- and 006_add_password_reset.sql.

-- ── Rollback 006: Remove password reset columns ─────────────────────────────
DROP INDEX IF EXISTS idx_users_password_reset_expires;
DROP INDEX IF EXISTS idx_users_password_reset_token;

ALTER TABLE users
  DROP COLUMN IF EXISTS password_reset_expires,
  DROP COLUMN IF EXISTS password_reset_token;

-- ── Rollback 005: Remove added indexes ───────────────────────────────────────
DROP INDEX IF EXISTS idx_local_repositories_user_id_status;
DROP INDEX IF EXISTS idx_payments_user_id_created_at;
DROP INDEX IF EXISTS idx_analyses_status;
DROP INDEX IF EXISTS idx_analyses_repository_id_user_id;
DROP INDEX IF EXISTS idx_analyses_user_id_created_at;
DROP INDEX IF EXISTS idx_repositories_user_id_created_at;
DROP INDEX IF EXISTS idx_users_stripe_customer_id;
DROP INDEX IF EXISTS idx_users_tier;
DROP INDEX IF EXISTS idx_users_email;
