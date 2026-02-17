-- Migration: Workflow Connectors
-- Adds integration_actions and step_templates tables for the workflow overhaul.
-- integration_actions defines per-integration actions (e.g., Slack "send_message").
-- step_templates provides reusable pre-built step configurations.

-- Prerequisite check: integrations table must exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations') THEN
    RAISE EXCEPTION 'Missing prerequisite: integrations table. Run 20240601000004_agent_platform.sql first.';
  END IF;
END
$$;

-- ============================================
-- INTEGRATION ACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS integration_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  parameter_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_auth BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(integration_id, action_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_actions_integration_id
  ON integration_actions (integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_actions_category
  ON integration_actions (category);
CREATE INDEX IF NOT EXISTS idx_integration_actions_active
  ON integration_actions (is_active) WHERE is_active = true;

-- updated_at trigger
CREATE OR REPLACE TRIGGER set_integration_actions_updated_at
  BEFORE UPDATE ON integration_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE integration_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on integration_actions"
  ON integration_actions FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Agents can read active integration_actions"
  ON integration_actions FOR SELECT
  USING (is_active = true);

-- ============================================
-- STEP TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS step_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  step_type TEXT NOT NULL CHECK (step_type IN ('agent_command', 'wait', 'condition', 'integration_action')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  retries INTEGER NOT NULL DEFAULT 0,
  on_failure TEXT NOT NULL DEFAULT 'stop' CHECK (on_failure IN ('continue', 'stop', 'skip')),
  integration_action_id UUID REFERENCES integration_actions(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_step_templates_category
  ON step_templates (category);
CREATE INDEX IF NOT EXISTS idx_step_templates_step_type
  ON step_templates (step_type);
CREATE INDEX IF NOT EXISTS idx_step_templates_integration_action_id
  ON step_templates (integration_action_id) WHERE integration_action_id IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE TRIGGER set_step_templates_updated_at
  BEFORE UPDATE ON step_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE step_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on step_templates"
  ON step_templates FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Authenticated users can read active step_templates"
  ON step_templates FOR SELECT
  USING (is_active = true);
