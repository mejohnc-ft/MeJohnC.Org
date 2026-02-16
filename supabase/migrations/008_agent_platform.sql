-- Agent Platform Migration
-- Issue: #140 - Create agents registry table
-- Prerequisites: schema.sql must be applied first (is_admin, update_updated_at_column)
-- This migration is idempotent and safe to re-run
-- Tables: agents

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
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Agent Platform migration completed successfully';
  RAISE NOTICE 'Tables created: agents';
  RAISE NOTICE 'Functions created: current_agent_id()';
END $$;
