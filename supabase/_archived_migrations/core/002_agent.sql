-- AI Site Manager Agent Schema
-- Run this in Supabase SQL Editor after schema.sql
-- Enables real-time communication between admin panel and home server agent

-- ============================================
-- AGENT COMMANDS (input queue)
-- Messages sent from admin panel to agent
-- ============================================
CREATE TABLE IF NOT EXISTS agent_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,                    -- Groups related messages in a conversation
  command_type TEXT NOT NULL CHECK (command_type IN ('chat', 'task', 'cancel')),
  content TEXT NOT NULL,                       -- User message or command payload
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'processing', 'completed', 'failed', 'cancelled')),
  user_id TEXT NOT NULL,                       -- Clerk user ID
  user_email TEXT NOT NULL,                    -- For audit trail
  metadata JSONB DEFAULT '{}',                 -- Additional context (e.g., conversation history reference)
  created_at TIMESTAMPTZ DEFAULT now(),
  received_at TIMESTAMPTZ,                     -- When agent acknowledged receipt
  completed_at TIMESTAMPTZ
);

-- ============================================
-- AGENT RESPONSES (output stream)
-- Responses from agent back to admin panel
-- ============================================
CREATE TABLE IF NOT EXISTS agent_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID REFERENCES agent_commands(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('message', 'tool_use', 'tool_result', 'progress', 'error', 'complete', 'confirmation_request')),
  content TEXT,                                -- Claude's response text (for message type)
  tool_name TEXT,                              -- Tool being called (for tool_use type)
  tool_input JSONB,                            -- Tool parameters
  tool_result JSONB,                           -- Tool execution result
  is_streaming BOOLEAN DEFAULT false,          -- Whether this is a streaming chunk
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AGENT TASKS (scheduled and background tasks)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('scheduled', 'triggered', 'manual')),
  schedule TEXT,                               -- Cron expression for scheduled tasks
  config JSONB DEFAULT '{}',                   -- Task-specific configuration
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed', 'disabled')),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_error TEXT,
  run_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_by TEXT NOT NULL,                    -- User who created the task
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AGENT TASK RUNS (execution history)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_task_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  output TEXT,                                 -- Task output/summary
  error TEXT,                                  -- Error message if failed
  metrics JSONB DEFAULT '{}',                  -- Duration, items processed, etc.
  triggered_by TEXT                            -- 'schedule', 'manual', or command_id
);

-- ============================================
-- AGENT SESSIONS (conversation sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  title TEXT,                                  -- Auto-generated or user-set conversation title
  is_active BOOLEAN DEFAULT true,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',                 -- Model used, token counts, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AGENT CONFIG (key-value configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,             -- Whether value should be masked in UI
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- ============================================
-- AGENT TOOL CONFIRMATIONS (pending confirmations)
-- For destructive actions requiring user approval
-- ============================================
CREATE TABLE IF NOT EXISTS agent_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  command_id UUID REFERENCES agent_commands(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL,
  description TEXT NOT NULL,                   -- Human-readable description of the action
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '5 minutes'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agent_commands_session ON agent_commands(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_commands_status ON agent_commands(status);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created ON agent_commands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_commands_pending ON agent_commands(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_agent_responses_command ON agent_responses(command_id);
CREATE INDEX IF NOT EXISTS idx_agent_responses_session ON agent_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_responses_created ON agent_responses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_next_run ON agent_tasks(next_run_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type ON agent_tasks(task_type);

CREATE INDEX IF NOT EXISTS idx_agent_task_runs_task ON agent_task_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_task_runs_status ON agent_task_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_task_runs_started ON agent_task_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_active ON agent_sessions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_agent_config_key ON agent_config(key);

CREATE INDEX IF NOT EXISTS idx_agent_confirmations_session ON agent_confirmations(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_confirmations_pending ON agent_confirmations(status) WHERE status = 'pending';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE agent_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_task_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_confirmations ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Admins can do everything with agent_commands" ON agent_commands
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with agent_responses" ON agent_responses
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with agent_tasks" ON agent_tasks
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can view agent_task_runs" ON agent_task_runs
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can do everything with agent_sessions" ON agent_sessions
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with agent_config" ON agent_config
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with agent_confirmations" ON agent_confirmations
  FOR ALL USING (is_admin());

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_sessions_updated_at
  BEFORE UPDATE ON agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_config_updated_at
  BEFORE UPDATE ON agent_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REALTIME PUBLICATION
-- Enable realtime for agent communication tables
-- ============================================
-- Note: Run these commands with appropriate permissions
-- ALTER PUBLICATION supabase_realtime ADD TABLE agent_commands;
-- ALTER PUBLICATION supabase_realtime ADD TABLE agent_responses;
-- ALTER PUBLICATION supabase_realtime ADD TABLE agent_confirmations;

-- ============================================
-- SEED DATA: Default Config
-- ============================================
INSERT INTO agent_config (key, value, description, is_secret) VALUES
  ('agent_model', '"claude-sonnet-4-20250514"', 'Default Claude model for agent responses', false),
  ('max_tokens', '4096', 'Maximum tokens for Claude responses', false),
  ('confirmation_timeout_minutes', '5', 'Time before pending confirmations expire', false),
  ('allowed_file_extensions', '[".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".sql", ".html"]', 'File types agent can read/write', false),
  ('repo_path', '""', 'Path to site repository on home server', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to clean up expired confirmations
CREATE OR REPLACE FUNCTION cleanup_expired_confirmations()
RETURNS void AS $$
BEGIN
  UPDATE agent_confirmations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session message count
CREATE OR REPLACE FUNCTION update_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_sessions
  SET
    message_count = message_count + 1,
    last_message_at = now(),
    updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER increment_session_message_count
  AFTER INSERT ON agent_commands
  FOR EACH ROW
  EXECUTE FUNCTION update_session_message_count();
