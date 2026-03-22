CREATE TABLE IF NOT EXISTS command_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES local_repositories(id) ON DELETE SET NULL,
  command_type VARCHAR(50) NOT NULL,
  params JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  result JSONB,
  duration_ms INTEGER,
  error_message TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_command_logs_user_id ON command_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_repository_id ON command_logs(repository_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_status ON command_logs(status);
