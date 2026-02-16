-- Agent Platform Migration
-- Issues: #140 - agents table, #141 - API key functions, #142 - agent_id columns,
--          #143 - workflow tables, #144 - integrations/credentials, #145 - audit_log
-- Prerequisites: schema.sql must be applied first (is_admin, update_updated_at_column)
-- Requires: pgcrypto extension (for SHA-256 hashing)
-- This migration is idempotent and safe to re-run
-- Tables: agents
-- Functions: current_agent_id, generate_agent_api_key, verify_agent_api_key,
--            rotate_agent_api_key, revoke_agent_api_key

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE EXCEPTION 'Missing prerequisite: is_admin() function. Run schema.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    RAISE EXCEPTION 'Missing prerequisite: update_updated_at_column() function. Run schema.sql first.';
  END IF;
END $$;

-- ============================================
-- HELPER FUNCTION: current_agent_id()
-- ============================================
-- Returns the UUID of the currently-authenticated agent from session context.
-- Returns NULL when no agent context is set (e.g. dashboard / human user).
-- Follows the current_tenant_id() pattern from 004_multi_tenant.sql.

CREATE OR REPLACE FUNCTION current_agent_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_agent_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- AGENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('autonomous', 'supervised', 'tool')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended')),
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  api_key_hash TEXT,
  api_key_prefix TEXT,
  health_status JSONB DEFAULT '{"status": "unknown"}'::jsonb,
  rate_limit_rpm INTEGER NOT NULL DEFAULT 60,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agents_api_key_hash ON agents(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status) WHERE status = 'active';

-- ============================================
-- RLS + POLICIES
-- ============================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with agents" ON agents;
CREATE POLICY "Admins can do everything with agents" ON agents
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Agents can read their own row" ON agents;
CREATE POLICY "Agents can read their own row" ON agents
  FOR SELECT USING (id = current_agent_id());

-- ============================================
-- TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PGCRYPTO EXTENSION (for SHA-256 hashing)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- API KEY MANAGEMENT FUNCTIONS (#141)
-- ============================================

-- Generate a new API key for an agent.
-- Key format: mj_agent_<32 random hex chars> (42 chars total)
-- Stores SHA-256 hash + prefix; returns plaintext key (only time it's visible).
CREATE OR REPLACE FUNCTION generate_agent_api_key(p_agent_id UUID)
RETURNS TEXT AS $$
DECLARE
  raw_key TEXT;
  full_key TEXT;
  key_hash TEXT;
  key_prefix TEXT;
BEGIN
  -- Generate 32 random hex chars
  raw_key := encode(gen_random_bytes(16), 'hex');
  full_key := 'mj_agent_' || raw_key;
  key_prefix := 'mj_agent_' || substring(raw_key from 1 for 8) || '...';
  key_hash := encode(digest(full_key, 'sha256'), 'hex');

  UPDATE agents
  SET api_key_hash = key_hash,
      api_key_prefix = key_prefix,
      updated_at = now()
  WHERE id = p_agent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found: %', p_agent_id;
  END IF;

  RETURN full_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify an API key and return the agent row if valid and active.
-- Returns NULL if key is invalid or agent is not active.
CREATE OR REPLACE FUNCTION verify_agent_api_key(p_api_key TEXT)
RETURNS SETOF agents AS $$
DECLARE
  key_hash TEXT;
BEGIN
  key_hash := encode(digest(p_api_key, 'sha256'), 'hex');

  RETURN QUERY
  SELECT *
  FROM agents
  WHERE agents.api_key_hash = key_hash
    AND agents.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant anon role execute on verify so edge functions can authenticate agents.
GRANT EXECUTE ON FUNCTION verify_agent_api_key(TEXT) TO anon;

-- Rotate an agent's API key: generates a new key, invalidating the old one.
-- Logs the rotation to audit_log if that table exists.
-- Returns the new plaintext key.
CREATE OR REPLACE FUNCTION rotate_agent_api_key(p_agent_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_key TEXT;
BEGIN
  -- generate_agent_api_key overwrites the hash, effectively invalidating the old key
  new_key := generate_agent_api_key(p_agent_id);

  -- Log rotation if audit_log table exists (created by #145)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    EXECUTE format(
      'INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details) VALUES (%L, %L, %L, %L, %L, %L)',
      'system', p_agent_id, 'api_key_rotated', 'agent', p_agent_id, '{"action": "rotate"}'::jsonb
    );
  END IF;

  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke an agent's API key by clearing the hash and prefix.
-- Logs the revocation to audit_log if that table exists.
-- Returns true on success.
CREATE OR REPLACE FUNCTION revoke_agent_api_key(p_agent_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE agents
  SET api_key_hash = NULL,
      api_key_prefix = NULL,
      updated_at = now()
  WHERE id = p_agent_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Log revocation if audit_log table exists (created by #145)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    EXECUTE format(
      'INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details) VALUES (%L, %L, %L, %L, %L, %L)',
      'system', p_agent_id, 'api_key_revoked', 'agent', p_agent_id, '{"action": "revoke"}'::jsonb
    );
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADD agent_id TO EXISTING AGENT TABLES (#142)
-- ============================================
-- Existing rows keep agent_id = NULL (single-agent era).
-- New rows from authenticated agents will have agent_id set by edge functions.

ALTER TABLE agent_commands ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE agent_responses ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE agent_task_runs ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_commands_agent_id ON agent_commands(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_responses_agent_id ON agent_responses(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_id ON agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_task_runs_agent_id ON agent_task_runs(agent_id);

-- Agent-scoped RLS policies: agents can only access rows belonging to them.
-- Dashboard (admin) users retain full access via existing is_admin() policies.

DROP POLICY IF EXISTS "Agents can access their own commands" ON agent_commands;
CREATE POLICY "Agents can access their own commands" ON agent_commands
  FOR ALL USING (agent_id = current_agent_id());

DROP POLICY IF EXISTS "Agents can access their own responses" ON agent_responses;
CREATE POLICY "Agents can access their own responses" ON agent_responses
  FOR ALL USING (agent_id = current_agent_id());

DROP POLICY IF EXISTS "Agents can access their own tasks" ON agent_tasks;
CREATE POLICY "Agents can access their own tasks" ON agent_tasks
  FOR ALL USING (agent_id = current_agent_id());

DROP POLICY IF EXISTS "Agents can read their own task runs" ON agent_task_runs;
CREATE POLICY "Agents can read their own task runs" ON agent_task_runs
  FOR SELECT USING (agent_id = current_agent_id());

-- ============================================
-- WORKFLOWS TABLE (#143)
-- ============================================
-- Workflow definitions with step-based execution plans.
-- Note: created_by uses TEXT (Clerk user ID) to match existing agent table patterns.

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'event')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with workflows" ON workflows;
CREATE POLICY "Admins can do everything with workflows" ON workflows
  FOR ALL USING (is_admin());

-- ============================================
-- WORKFLOW_RUNS TABLE (#143)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  trigger_type TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}'::jsonb,
  step_results JSONB DEFAULT '[]'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_history ON workflow_runs(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status) WHERE status IN ('pending', 'running');

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with workflow_runs" ON workflow_runs;
CREATE POLICY "Admins can do everything with workflow_runs" ON workflow_runs
  FOR ALL USING (is_admin());

-- ============================================
-- INTEGRATIONS TABLE (#144)
-- ============================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,
  service_type TEXT NOT NULL CHECK (service_type IN ('oauth2', 'api_key', 'webhook', 'custom')),
  display_name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  health_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrations_service_name ON integrations(service_name);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status) WHERE status = 'active';

DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with integrations" ON integrations;
CREATE POLICY "Admins can do everything with integrations" ON integrations
  FOR ALL USING (is_admin());

-- ============================================
-- INTEGRATION_CREDENTIALS TABLE (#144)
-- ============================================
-- encrypted_data is AES-256-GCM encrypted JSON, decrypted only server-side in edge functions.
-- NEVER returned to agents via RLS — agents have no direct policy on this table.

CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('oauth2_token', 'api_key', 'service_account', 'custom')),
  encrypted_data TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_credentials_lookup ON integration_credentials(integration_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_expiry ON integration_credentials(expires_at) WHERE expires_at IS NOT NULL;

DROP TRIGGER IF EXISTS update_integration_credentials_updated_at ON integration_credentials;
CREATE TRIGGER update_integration_credentials_updated_at
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

-- Admin-only: credentials are never exposed to agents directly.
-- Edge functions use service_role key which bypasses RLS.
DROP POLICY IF EXISTS "Admins can do everything with integration_credentials" ON integration_credentials;
CREATE POLICY "Admins can do everything with integration_credentials" ON integration_credentials
  FOR ALL USING (is_admin());

-- ============================================
-- AGENT_INTEGRATIONS JUNCTION TABLE (#144)
-- ============================================
-- Maps which agents have access to which integrations.
-- granted_by uses TEXT (Clerk user ID) to match existing patterns.

CREATE TABLE IF NOT EXISTS agent_integrations (
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  granted_scopes TEXT[] DEFAULT '{}',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by TEXT,
  PRIMARY KEY (agent_id, integration_id)
);

ALTER TABLE agent_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with agent_integrations" ON agent_integrations;
CREATE POLICY "Admins can do everything with agent_integrations" ON agent_integrations
  FOR ALL USING (is_admin());

-- Agents can see which integrations they've been granted.
DROP POLICY IF EXISTS "Agents can view their own integrations" ON agent_integrations;
CREATE POLICY "Agents can view their own integrations" ON agent_integrations
  FOR SELECT USING (agent_id = current_agent_id());

-- Agents can view integration details for their granted integrations.
DROP POLICY IF EXISTS "Agents can view granted integrations" ON integrations;
CREATE POLICY "Agents can view granted integrations" ON integrations
  FOR SELECT USING (
    id IN (SELECT integration_id FROM agent_integrations WHERE agent_id = current_agent_id())
  );

-- ============================================
-- AUDIT_LOG TABLE (#145)
-- ============================================
-- Partitioned by month for query performance.
-- Agents CANNOT read or write this table directly.

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system', 'scheduler')),
  actor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  correlation_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions for current and next 3 months
CREATE TABLE IF NOT EXISTS audit_log_2026_02 PARTITION OF audit_log
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_03 PARTITION OF audit_log
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_04 PARTITION OF audit_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_05 PARTITION OF audit_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX IF NOT EXISTS idx_audit_log_action_ts ON audit_log (action, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_ts ON audit_log (actor_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_correlation ON audit_log (correlation_id) WHERE correlation_id IS NOT NULL;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with audit_log" ON audit_log;
CREATE POLICY "Admins can do everything with audit_log" ON audit_log
  FOR ALL USING (is_admin());

-- ============================================
-- AUDIT HELPER FUNCTION (#145)
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_actor_type TEXT,
  p_actor_id TEXT,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_correlation_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details, correlation_id)
  VALUES (p_actor_type, p_actor_id, p_action, p_resource_type, p_resource_id, p_details, p_correlation_id)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUDIT AUTO-LOGGING TRIGGERS (#145)
-- ============================================

-- Generic audit trigger function for INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  audit_action TEXT;
  resource_id_val TEXT;
  detail_json JSONB;
BEGIN
  audit_action := TG_TABLE_NAME || '.' || lower(TG_OP);

  IF TG_OP = 'DELETE' THEN
    resource_id_val := OLD.id::TEXT;
    detail_json := jsonb_build_object('operation', TG_OP);
  ELSIF TG_OP = 'INSERT' THEN
    resource_id_val := NEW.id::TEXT;
    detail_json := jsonb_build_object('operation', TG_OP);
  ELSE -- UPDATE
    resource_id_val := NEW.id::TEXT;
    detail_json := jsonb_build_object('operation', TG_OP);
  END IF;

  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
  VALUES (
    CASE WHEN current_agent_id() IS NOT NULL THEN 'agent' ELSE 'user' END,
    COALESCE(current_agent_id()::TEXT, current_setting('request.jwt.claims', true)::jsonb->>'sub'),
    audit_action,
    TG_TABLE_NAME,
    resource_id_val,
    detail_json
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit triggers to key tables
DROP TRIGGER IF EXISTS audit_agents ON agents;
CREATE TRIGGER audit_agents
  AFTER INSERT OR UPDATE OR DELETE ON agents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_workflows ON workflows;
CREATE TRIGGER audit_workflows
  AFTER INSERT OR UPDATE OR DELETE ON workflows
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_workflow_runs ON workflow_runs;
CREATE TRIGGER audit_workflow_runs
  AFTER INSERT OR UPDATE ON workflow_runs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_integration_credentials ON integration_credentials;
CREATE TRIGGER audit_integration_credentials
  AFTER INSERT OR UPDATE OR DELETE ON integration_credentials
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_agent_commands ON agent_commands;
CREATE TRIGGER audit_agent_commands
  AFTER INSERT ON agent_commands
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================
-- AUTO-CREATE FUTURE PARTITIONS (#145)
-- ============================================
-- Call monthly via pg_cron or manually to create next month's partition.

CREATE OR REPLACE FUNCTION create_audit_log_partition()
RETURNS VOID AS $$
DECLARE
  next_month DATE;
  partition_name TEXT;
  start_date TEXT;
  end_date TEXT;
BEGIN
  next_month := date_trunc('month', now() + interval '1 month');
  partition_name := 'audit_log_' || to_char(next_month, 'YYYY_MM');
  start_date := to_char(next_month, 'YYYY-MM-DD');
  end_date := to_char(next_month + interval '1 month', 'YYYY-MM-DD');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Agent Platform migration completed successfully';
  RAISE NOTICE 'Tables created: agents, workflows, workflow_runs, integrations, integration_credentials, agent_integrations, audit_log (partitioned)';
  RAISE NOTICE 'Columns added: agent_id on agent_commands, agent_responses, agent_tasks, agent_task_runs';
  RAISE NOTICE 'Functions created: current_agent_id(), generate/verify/rotate/revoke_agent_api_key(), log_audit_event(), audit_trigger_func(), create_audit_log_partition()';
END $$;
