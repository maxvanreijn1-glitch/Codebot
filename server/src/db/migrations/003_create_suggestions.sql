CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES local_repositories(id) ON DELETE SET NULL,
  file_path VARCHAR(1000),
  suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN ('improvement', 'bug', 'performance', 'security', 'style')),
  message TEXT NOT NULL,
  code_snippet TEXT,
  line_number INTEGER,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_repository_id ON suggestions(repository_id);
