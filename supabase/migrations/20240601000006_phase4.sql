-- Phase 4 Migration: Advanced Features
-- Issues: #156, #157, #158, #159, #160, #161, #162
-- Prerequisites: 20240601000005_scheduler.sql (scheduled_workflow_runs, pg_cron, pg_net)
-- This migration adds: capability definitions, agent skills, signing secrets,
-- event bus (types, subscriptions, events), seed data, integration health check cron job

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
    RAISE EXCEPTION 'Missing prerequisite: agents table. Run agent platform migrations first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows') THEN
    RAISE EXCEPTION 'Missing prerequisite: workflows table. Run agent platform migrations first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations') THEN
    RAISE EXCEPTION 'Missing prerequisite: integrations table. Run agent platform migrations first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    RAISE EXCEPTION 'Missing prerequisite: audit_log table. Run agent platform migrations first.';
  END IF;
END $$;

-- ============================================
-- A: CAPABILITY DEFINITIONS TABLE (#162)
-- ============================================

CREATE TABLE IF NOT EXISTS capability_definitions (
  name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capability_definitions_category ON capability_definitions(category);

ALTER TABLE capability_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read capability definitions" ON capability_definitions;
CREATE POLICY "Anyone can read capability definitions" ON capability_definitions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage capability definitions" ON capability_definitions;
CREATE POLICY "Admins can manage capability definitions" ON capability_definitions
  FOR ALL USING (is_admin());

-- ============================================
-- B: SEED CAPABILITY DEFINITIONS (#162)
-- ============================================

INSERT INTO capability_definitions (name, display_name, description, category) VALUES
  ('crm', 'CRM', 'Contact and relationship management operations', 'data'),
  ('kb', 'Knowledge Base', 'Knowledge base search and management', 'data'),
  ('video', 'Video Processing', 'Video transcoding, analysis, and management', 'media'),
  ('meta_analysis', 'Meta-Analysis', 'Cross-domain data analysis and pattern recognition', 'analytics'),
  ('email', 'Email', 'Email sending, receiving, and management', 'communication'),
  ('calendar', 'Calendar', 'Calendar event scheduling and management', 'productivity'),
  ('tasks', 'Task Management', 'Task creation, assignment, and tracking', 'productivity'),
  ('documents', 'Documents', 'Document creation, editing, and storage', 'productivity'),
  ('research', 'Research', 'Web research, data gathering, and summarization', 'analytics'),
  ('code', 'Code Operations', 'Code generation, review, and deployment', 'engineering'),
  ('data', 'Data Processing', 'Data transformation, ETL, and pipeline operations', 'data'),
  ('social', 'Social Media', 'Social media posting and engagement', 'communication'),
  ('finance', 'Finance', 'Financial data, invoicing, and payment operations', 'data'),
  ('automation', 'Automation', 'Workflow automation and integration orchestration', 'system')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- C: AGENT SKILLS JUNCTION TABLE (#160)
-- ============================================

CREATE TABLE IF NOT EXISTS agent_skills (
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  capability_name TEXT NOT NULL REFERENCES capability_definitions(name) ON DELETE CASCADE,
  proficiency INTEGER NOT NULL DEFAULT 50 CHECK (proficiency BETWEEN 0 AND 100),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by TEXT,
  PRIMARY KEY (agent_id, capability_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_skills_capability ON agent_skills(capability_name);
CREATE INDEX IF NOT EXISTS idx_agent_skills_proficiency ON agent_skills(capability_name, proficiency DESC);

ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage agent skills" ON agent_skills;
CREATE POLICY "Admins can manage agent skills" ON agent_skills
  FOR ALL USING (is_admin());

-- Function: Get all skills for an agent
CREATE OR REPLACE FUNCTION get_agent_skills(p_agent_id UUID)
RETURNS TABLE (
  capability_name TEXT,
  display_name TEXT,
  description TEXT,
  category TEXT,
  proficiency INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cd.name,
    cd.display_name,
    cd.description,
    cd.category,
    ags.proficiency
  FROM agent_skills ags
  JOIN capability_definitions cd ON cd.name = ags.capability_name
  WHERE ags.agent_id = p_agent_id
  ORDER BY ags.proficiency DESC, cd.display_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Get all agents with a specific skill
CREATE OR REPLACE FUNCTION get_skill_agents(p_capability_name TEXT)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  agent_type TEXT,
  agent_status TEXT,
  proficiency INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.type::TEXT,
    a.status::TEXT,
    ags.proficiency
  FROM agent_skills ags
  JOIN agents a ON a.id = ags.agent_id
  WHERE ags.capability_name = p_capability_name
    AND a.status = 'active'
  ORDER BY ags.proficiency DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Get the best agent for a given skill
CREATE OR REPLACE FUNCTION get_best_agent_for_skill(p_capability_name TEXT)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  proficiency INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    ags.proficiency
  FROM agent_skills ags
  JOIN agents a ON a.id = ags.agent_id
  WHERE ags.capability_name = p_capability_name
    AND a.status = 'active'
  ORDER BY ags.proficiency DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Check if an agent can perform a specific skill
CREATE OR REPLACE FUNCTION can_agent_perform_skill(p_agent_id UUID, p_capability_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM agent_skills ags
    JOIN agents a ON a.id = ags.agent_id
    WHERE ags.agent_id = p_agent_id
      AND ags.capability_name = p_capability_name
      AND a.status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Trigger: sync agent_skills changes to agents.capabilities array
CREATE OR REPLACE FUNCTION sync_agent_capabilities()
RETURNS TRIGGER AS $$
DECLARE
  target_agent_id UUID;
BEGIN
  -- Determine which agent_id was affected
  IF TG_OP = 'DELETE' THEN
    target_agent_id := OLD.agent_id;
  ELSE
    target_agent_id := NEW.agent_id;
  END IF;

  -- Rebuild the capabilities array from agent_skills
  UPDATE agents
  SET capabilities = (
    SELECT COALESCE(array_agg(capability_name ORDER BY capability_name), '{}')
    FROM agent_skills
    WHERE agent_id = target_agent_id
  ),
  updated_at = now()
  WHERE id = target_agent_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_agent_capabilities ON agent_skills;
CREATE TRIGGER trg_sync_agent_capabilities
  AFTER INSERT OR UPDATE OR DELETE ON agent_skills
  FOR EACH ROW
  EXECUTE FUNCTION sync_agent_capabilities();

-- ============================================
-- D: SIGNING SECRET ON AGENTS (#159)
-- ============================================

-- Add encrypted signing secret column to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS signing_secret_encrypted JSONB;

-- Function: Generate a new signing secret for an agent
CREATE OR REPLACE FUNCTION generate_signing_secret(p_agent_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_secret TEXT;
BEGIN
  -- Generate a 32-byte hex secret prefixed with mj_sign_
  new_secret := 'mj_sign_' || encode(gen_random_bytes(32), 'hex');

  -- Store the secret encrypted (encryption happens at the edge function layer)
  -- Here we store a placeholder that the edge function will replace with the encrypted version
  UPDATE agents
  SET signing_secret_encrypted = jsonb_build_object(
    'pending_plaintext', new_secret,
    'generated_at', now()::TEXT
  ),
  updated_at = now()
  WHERE id = p_agent_id;

  -- Audit log
  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
  VALUES (
    'system', NULL, 'agent.signing_secret.generated', 'agent', p_agent_id::TEXT,
    jsonb_build_object('prefix', substring(new_secret from 1 for 16) || '...')
  );

  RETURN new_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Rotate signing secret (generate new, invalidate old)
CREATE OR REPLACE FUNCTION rotate_signing_secret(p_agent_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_secret TEXT;
BEGIN
  -- Audit the rotation
  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
  VALUES (
    'system', NULL, 'agent.signing_secret.rotated', 'agent', p_agent_id::TEXT,
    jsonb_build_object('rotated_at', now()::TEXT)
  );

  -- Generate new secret (reuses generate_signing_secret logic)
  new_secret := 'mj_sign_' || encode(gen_random_bytes(32), 'hex');

  UPDATE agents
  SET signing_secret_encrypted = jsonb_build_object(
    'pending_plaintext', new_secret,
    'generated_at', now()::TEXT
  ),
  updated_at = now()
  WHERE id = p_agent_id;

  RETURN new_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Revoke signing secret
CREATE OR REPLACE FUNCTION revoke_signing_secret(p_agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agents
  SET signing_secret_encrypted = NULL,
      updated_at = now()
  WHERE id = p_agent_id;

  -- Audit log
  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
  VALUES (
    'system', NULL, 'agent.signing_secret.revoked', 'agent', p_agent_id::TEXT,
    jsonb_build_object('revoked_at', now()::TEXT)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- E: EVENT BUS TABLES (#161)
-- ============================================

-- Event Types (registry of all event types in the system)
CREATE TABLE IF NOT EXISTS event_types (
  name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'system',
  schema JSONB,
  is_built_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_types_category ON event_types(category);

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read event types" ON event_types;
CREATE POLICY "Anyone can read event types" ON event_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage event types" ON event_types;
CREATE POLICY "Admins can manage event types" ON event_types
  FOR ALL USING (is_admin());

-- Event Subscriptions (who listens to what events)
CREATE TABLE IF NOT EXISTS event_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL REFERENCES event_types(name) ON DELETE CASCADE,
  subscriber_type TEXT NOT NULL CHECK (subscriber_type IN ('workflow', 'agent', 'webhook')),
  subscriber_id TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_subscriptions_event_type ON event_subscriptions(event_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_event_subscriptions_subscriber ON event_subscriptions(subscriber_type, subscriber_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_subscriptions_unique
  ON event_subscriptions(event_type, subscriber_type, subscriber_id);

ALTER TABLE event_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage event subscriptions" ON event_subscriptions;
CREATE POLICY "Admins can manage event subscriptions" ON event_subscriptions
  FOR ALL USING (is_admin());

-- Events (log of emitted events)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL REFERENCES event_types(name),
  payload JSONB NOT NULL DEFAULT '{}',
  source_type TEXT NOT NULL CHECK (source_type IN ('agent', 'workflow', 'system', 'webhook', 'user')),
  source_id TEXT,
  correlation_id TEXT,
  dispatched_to JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_correlation ON events(correlation_id) WHERE correlation_id IS NOT NULL;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read events" ON events;
CREATE POLICY "Admins can read events" ON events
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "System can insert events" ON events;
CREATE POLICY "System can insert events" ON events
  FOR INSERT WITH CHECK (true);

-- Function: Emit an event and dispatch to subscribers
CREATE OR REPLACE FUNCTION emit_event(
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}',
  p_source_type TEXT DEFAULT 'system',
  p_source_id TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
  sub RECORD;
  dispatch_targets JSONB := '[]'::JSONB;
  supabase_url TEXT;
  scheduler_secret TEXT;
BEGIN
  -- Validate event type exists
  IF NOT EXISTS (SELECT 1 FROM event_types WHERE name = p_event_type) THEN
    RAISE EXCEPTION 'Unknown event type: %', p_event_type;
  END IF;

  -- Insert the event
  INSERT INTO events (event_type, payload, source_type, source_id, correlation_id)
  VALUES (p_event_type, p_payload, p_source_type, p_source_id, p_correlation_id)
  RETURNING id INTO event_id;

  -- Get config for HTTP dispatch
  supabase_url := current_setting('app.supabase_url', true);
  scheduler_secret := current_setting('app.scheduler_secret', true);

  -- Dispatch to active subscribers
  FOR sub IN
    SELECT id, subscriber_type, subscriber_id, config
    FROM event_subscriptions
    WHERE event_type = p_event_type
      AND is_active = true
  LOOP
    dispatch_targets := dispatch_targets || jsonb_build_object(
      'subscription_id', sub.id,
      'subscriber_type', sub.subscriber_type,
      'subscriber_id', sub.subscriber_id
    );

    -- Dispatch based on subscriber type
    CASE sub.subscriber_type
      WHEN 'workflow' THEN
        -- Dispatch to workflow-executor via pg_net
        IF supabase_url IS NOT NULL AND supabase_url != '' AND scheduler_secret IS NOT NULL THEN
          PERFORM net.http_post(
            url := supabase_url || '/functions/v1/workflow-executor',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-scheduler-secret', scheduler_secret
            ),
            body := jsonb_build_object(
              'workflow_id', sub.subscriber_id,
              'trigger_type', 'event',
              'trigger_data', jsonb_build_object(
                'event_id', event_id,
                'event_type', p_event_type,
                'payload', p_payload
              )
            )
          );
        END IF;

      WHEN 'webhook' THEN
        -- Dispatch to webhook URL via pg_net
        IF sub.config ? 'url' THEN
          PERFORM net.http_post(
            url := sub.config->>'url',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'X-Event-Type', p_event_type,
              'X-Event-Id', event_id::TEXT
            ),
            body := jsonb_build_object(
              'event_id', event_id,
              'event_type', p_event_type,
              'payload', p_payload,
              'timestamp', now()::TEXT
            )
          );
        END IF;

      WHEN 'agent' THEN
        -- For agent subscribers, insert directly into events table for polling
        -- (agents query events table filtered by their subscriptions)
        NULL; -- No additional action needed; the event record is already created

      ELSE
        RAISE WARNING 'Unknown subscriber type: %', sub.subscriber_type;
    END CASE;
  END LOOP;

  -- Update the event with dispatch targets
  UPDATE events
  SET dispatched_to = dispatch_targets
  WHERE id = event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit trigger for events table
CREATE OR REPLACE FUNCTION audit_event_emission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
  VALUES (
    NEW.source_type,
    NEW.source_id,
    'event.emitted',
    'event',
    NEW.id::TEXT,
    jsonb_build_object(
      'event_type', NEW.event_type,
      'correlation_id', NEW.correlation_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_event_emission ON events;
CREATE TRIGGER trg_audit_event_emission
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION audit_event_emission();

-- ============================================
-- F: SEED EVENT TYPES (#161)
-- ============================================

INSERT INTO event_types (name, display_name, description, category, is_built_in) VALUES
  ('contact.created', 'Contact Created', 'Fired when a new contact is created', 'crm', true),
  ('contact.updated', 'Contact Updated', 'Fired when a contact is updated', 'crm', true),
  ('contact.deleted', 'Contact Deleted', 'Fired when a contact is deleted', 'crm', true),
  ('task.created', 'Task Created', 'Fired when a new task is created', 'tasks', true),
  ('task.completed', 'Task Completed', 'Fired when a task is completed', 'tasks', true),
  ('task.overdue', 'Task Overdue', 'Fired when a task becomes overdue', 'tasks', true),
  ('workflow.started', 'Workflow Started', 'Fired when a workflow run begins', 'workflows', true),
  ('workflow.completed', 'Workflow Completed', 'Fired when a workflow run completes', 'workflows', true),
  ('workflow.failed', 'Workflow Failed', 'Fired when a workflow run fails', 'workflows', true),
  ('agent.registered', 'Agent Registered', 'Fired when a new agent is registered', 'agents', true),
  ('agent.status_changed', 'Agent Status Changed', 'Fired when an agent status changes', 'agents', true),
  ('agent.error', 'Agent Error', 'Fired when an agent encounters an error', 'agents', true),
  ('integration.connected', 'Integration Connected', 'Fired when an integration is connected', 'integrations', true),
  ('integration.disconnected', 'Integration Disconnected', 'Fired when an integration is disconnected', 'integrations', true),
  ('integration.error', 'Integration Error', 'Fired when an integration encounters an error', 'integrations', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- G: SEED AGENTS (#162)
-- ============================================

-- Seed 3 default agents with deterministic UUIDs for referencing
INSERT INTO agents (id, name, type, status, capabilities, rate_limit_rpm, metadata)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'OpenClaw',
    'autonomous',
    'active',
    ARRAY['crm', 'email', 'tasks', 'research', 'automation'],
    120,
    '{"description": "Autonomous agent for CRM, email, and task automation", "version": "1.0"}'::JSONB
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Dashboard',
    'tool',
    'active',
    ARRAY['data', 'meta_analysis', 'documents'],
    300,
    '{"description": "Tool agent for dashboard data queries and document generation", "version": "1.0"}'::JSONB
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Scheduler',
    'tool',
    'active',
    ARRAY['calendar', 'tasks', 'automation'],
    60,
    '{"description": "Tool agent for scheduling and calendar operations", "version": "1.0"}'::JSONB
  )
ON CONFLICT (id) DO NOTHING;

-- Generate API keys for seeded agents (only if they don't already have one)
DO $$
DECLARE
  agent_rec RECORD;
BEGIN
  FOR agent_rec IN
    SELECT id FROM agents
    WHERE id IN (
      'a0000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000002',
      'a0000000-0000-0000-0000-000000000003'
    )
    AND api_key_hash IS NULL
  LOOP
    PERFORM generate_agent_api_key(agent_rec.id);
  END LOOP;
END $$;

-- Seed agent_skills for the 3 default agents
INSERT INTO agent_skills (agent_id, capability_name, proficiency, granted_by) VALUES
  -- OpenClaw: strong in CRM, email, tasks, research, automation
  ('a0000000-0000-0000-0000-000000000001', 'crm', 90, 'system'),
  ('a0000000-0000-0000-0000-000000000001', 'email', 85, 'system'),
  ('a0000000-0000-0000-0000-000000000001', 'tasks', 80, 'system'),
  ('a0000000-0000-0000-0000-000000000001', 'research', 75, 'system'),
  ('a0000000-0000-0000-0000-000000000001', 'automation', 85, 'system'),
  -- Dashboard: strong in data, meta_analysis, documents
  ('a0000000-0000-0000-0000-000000000002', 'data', 95, 'system'),
  ('a0000000-0000-0000-0000-000000000002', 'meta_analysis', 90, 'system'),
  ('a0000000-0000-0000-0000-000000000002', 'documents', 80, 'system'),
  -- Scheduler: strong in calendar, tasks, automation
  ('a0000000-0000-0000-0000-000000000003', 'calendar', 95, 'system'),
  ('a0000000-0000-0000-0000-000000000003', 'tasks', 85, 'system'),
  ('a0000000-0000-0000-0000-000000000003', 'automation', 70, 'system')
ON CONFLICT (agent_id, capability_name) DO NOTHING;

-- ============================================
-- H: INTEGRATION HEALTH CHECK CRON JOB (#157)
-- ============================================

-- Add health_check_url and health_checked_at columns to integrations
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS health_check_url TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS health_checked_at TIMESTAMPTZ;

-- pg_cron job to call integration-health edge function hourly
SELECT cron.schedule(
  'integration-health-check',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/integration-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-scheduler-secret', current_setting('app.scheduler_secret', true)
    ),
    body := '{}'::jsonb
  )
  $$
);

-- ============================================
-- AUDIT TRIGGERS FOR NEW TABLES
-- ============================================

-- Audit trigger for capability_definitions
CREATE OR REPLACE FUNCTION audit_capability_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (actor_type, action, resource_type, resource_id, details)
    VALUES ('system', 'capability.' || lower(TG_OP), 'capability_definition', OLD.name,
            jsonb_build_object('display_name', OLD.display_name));
    RETURN OLD;
  ELSE
    INSERT INTO audit_log (actor_type, action, resource_type, resource_id, details)
    VALUES ('system', 'capability.' || lower(TG_OP), 'capability_definition', NEW.name,
            jsonb_build_object('display_name', NEW.display_name, 'category', NEW.category));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_capability_change ON capability_definitions;
CREATE TRIGGER trg_audit_capability_change
  AFTER INSERT OR UPDATE OR DELETE ON capability_definitions
  FOR EACH ROW
  EXECUTE FUNCTION audit_capability_change();

-- Audit trigger for event_subscriptions
CREATE OR REPLACE FUNCTION audit_event_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (actor_type, action, resource_type, resource_id, details)
    VALUES ('system', 'event_subscription.' || lower(TG_OP), 'event_subscription', OLD.id::TEXT,
            jsonb_build_object('event_type', OLD.event_type, 'subscriber_type', OLD.subscriber_type));
    RETURN OLD;
  ELSE
    INSERT INTO audit_log (actor_type, action, resource_type, resource_id, details)
    VALUES ('system', 'event_subscription.' || lower(TG_OP), 'event_subscription', NEW.id::TEXT,
            jsonb_build_object('event_type', NEW.event_type, 'subscriber_type', NEW.subscriber_type, 'is_active', NEW.is_active));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_event_subscription_change ON event_subscriptions;
CREATE TRIGGER trg_audit_event_subscription_change
  AFTER INSERT OR UPDATE OR DELETE ON event_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION audit_event_subscription_change();

-- ============================================
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 4 migration completed successfully';
  RAISE NOTICE 'Tables created: capability_definitions, agent_skills, event_types, event_subscriptions, events';
  RAISE NOTICE 'Columns added: agents.signing_secret_encrypted, integrations.health_check_url, integrations.health_checked_at';
  RAISE NOTICE 'Functions created: get_agent_skills(), get_skill_agents(), get_best_agent_for_skill(), can_agent_perform_skill(), emit_event()';
  RAISE NOTICE 'Functions created: generate_signing_secret(), rotate_signing_secret(), revoke_signing_secret()';
  RAISE NOTICE 'Cron jobs scheduled: integration-health-check (hourly)';
  RAISE NOTICE 'Seed data: 14 capabilities, 15 event types, 3 agents (OpenClaw, Dashboard, Scheduler)';
END $$;
