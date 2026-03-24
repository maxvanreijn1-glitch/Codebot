-- Migration 006: Add password reset token fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE;

-- Index for fast token lookup during reset validation
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token)
  WHERE password_reset_token IS NOT NULL;

-- Index to efficiently clean up expired tokens
CREATE INDEX IF NOT EXISTS idx_users_password_reset_expires ON users(password_reset_expires)
  WHERE password_reset_expires IS NOT NULL;
