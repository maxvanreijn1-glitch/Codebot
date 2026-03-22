CREATE TABLE IF NOT EXISTS local_repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  local_path VARCHAR(1000) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'syncing', 'error')),
  file_count INTEGER DEFAULT 0,
  last_synced TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_repositories_user_id ON local_repositories(user_id);
