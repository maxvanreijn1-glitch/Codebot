-- Migration 009: circuit storage table + admin account
--
-- 1. Create the circuits table for saving user circuit designs
-- 2. Add 'admin' tier support (usage_limit = -1 means unlimited)
-- 3. Seed the admin account (mwatson@deliverance.org.uk / Pyramids2008)

-- ── circuits table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circuits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  graph_data    JSONB NOT NULL,
  arduino_code  TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circuits_user_id ON circuits(user_id);
CREATE INDEX IF NOT EXISTS idx_circuits_updated_at ON circuits(updated_at);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_circuits_updated_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_circuits_updated_at ON circuits;
CREATE TRIGGER trg_circuits_updated_at
  BEFORE UPDATE ON circuits
  FOR EACH ROW EXECUTE FUNCTION update_circuits_updated_at();

-- ── admin tier column ─────────────────────────────────────────────────────────
-- Allow usage_limit = -1 to signal "unlimited" (used for admin accounts)
ALTER TABLE users
  ALTER COLUMN usage_limit DROP DEFAULT;
ALTER TABLE users
  ALTER COLUMN usage_limit SET DEFAULT 5;
-- (No type change needed; -1 is a valid INTEGER sentinel for "no limit")

-- ── seed admin account ────────────────────────────────────────────────────────
-- Password: Pyramids2008  (bcrypt, cost 12)
-- The hash below was generated with bcryptjs.hash('Pyramids2008', 12)
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  tier,
  subscription_plan,
  subscription_status,
  usage_count,
  usage_limit,
  code_generation_count,
  circuit_generation_count
)
VALUES (
  uuid_generate_v4(),
  'mwatson@deliverance.org.uk',
  '$2a$12$vOyyHdxwejC040BxVrwbweM9NDwL47bn7L9sVbfm2vtPr4DPtbVdC',
  'max watson',
  'admin',
  'admin',
  'active',
  0,
  -1,
  0,
  0
)
ON CONFLICT (email) DO UPDATE
  SET
    name               = EXCLUDED.name,
    tier               = EXCLUDED.tier,
    subscription_plan  = EXCLUDED.subscription_plan,
    usage_limit        = EXCLUDED.usage_limit,
    password_hash      = EXCLUDED.password_hash;
