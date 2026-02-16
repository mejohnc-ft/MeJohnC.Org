-- Scheduler Migration: pg_cron + pg_net for workflow scheduling
-- Issue: #148
-- Prerequisites: 20240601000004_agent_platform.sql (workflows, workflow_runs, audit_log)
-- Requires: pg_cron, pg_net extensions (available on Supabase hosted instances)
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows') THEN
    RAISE EXCEPTION 'Missing prerequisite: workflows table. Run 20240601000004_agent_platform.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_runs') THEN
    RAISE EXCEPTION 'Missing prerequisite: workflow_runs table. Run 20240601000004_agent_platform.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    RAISE EXCEPTION 'Missing prerequisite: audit_log table. Run 20240601000004_agent_platform.sql first.';
  END IF;
END $$;

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- SCHEDULED_WORKFLOW_RUNS TRACKING TABLE
-- ============================================
-- Tracks dispatched scheduled runs to prevent duplicate dispatch per minute.

CREATE TABLE IF NOT EXISTS scheduled_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  dispatched_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'failed')),
  response_status INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_workflow_runs_dedup
  ON scheduled_workflow_runs(workflow_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_workflow_runs_status
  ON scheduled_workflow_runs(status) WHERE status = 'pending';

ALTER TABLE scheduled_workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with scheduled_workflow_runs" ON scheduled_workflow_runs;
CREATE POLICY "Admins can do everything with scheduled_workflow_runs" ON scheduled_workflow_runs
  FOR ALL USING (is_admin());

-- ============================================
-- CRON FIELD MATCHER
-- ============================================
-- Matches a single cron field value against the current value.
-- Supports: * (any), exact number, ranges (1-5), lists (1,3,5), steps (*/5, 1-10/2)

CREATE OR REPLACE FUNCTION cron_field_matches(field_expr TEXT, current_val INTEGER, min_val INTEGER, max_val INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  part TEXT;
  parts TEXT[];
  range_parts TEXT[];
  step_parts TEXT[];
  range_start INTEGER;
  range_end INTEGER;
  step_val INTEGER;
  i INTEGER;
BEGIN
  -- Wildcard matches everything
  IF field_expr = '*' THEN
    RETURN true;
  END IF;

  -- Split by comma for lists (e.g., "1,3,5")
  parts := string_to_array(field_expr, ',');

  FOR i IN 1..array_length(parts, 1) LOOP
    part := trim(parts[i]);

    -- Check for step values (e.g., "*/5" or "1-10/2")
    IF position('/' IN part) > 0 THEN
      step_parts := string_to_array(part, '/');
      step_val := step_parts[2]::INTEGER;

      IF step_parts[1] = '*' THEN
        range_start := min_val;
        range_end := max_val;
      ELSIF position('-' IN step_parts[1]) > 0 THEN
        range_parts := string_to_array(step_parts[1], '-');
        range_start := range_parts[1]::INTEGER;
        range_end := range_parts[2]::INTEGER;
      ELSE
        range_start := step_parts[1]::INTEGER;
        range_end := max_val;
      END IF;

      IF current_val >= range_start AND current_val <= range_end
         AND (current_val - range_start) % step_val = 0 THEN
        RETURN true;
      END IF;

    -- Check for ranges (e.g., "1-5")
    ELSIF position('-' IN part) > 0 THEN
      range_parts := string_to_array(part, '-');
      range_start := range_parts[1]::INTEGER;
      range_end := range_parts[2]::INTEGER;

      IF current_val >= range_start AND current_val <= range_end THEN
        RETURN true;
      END IF;

    -- Exact match
    ELSE
      IF current_val = part::INTEGER THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;

  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5-FIELD CRON EXPRESSION EVALUATOR
-- ============================================
-- Evaluates "minute hour day_of_month month day_of_week" against current time.

CREATE OR REPLACE FUNCTION cron_matches_now(cron_expression TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  fields TEXT[];
  now_ts TIMESTAMPTZ;
  curr_minute INTEGER;
  curr_hour INTEGER;
  curr_dom INTEGER;
  curr_month INTEGER;
  curr_dow INTEGER;
BEGIN
  fields := string_to_array(trim(cron_expression), ' ');

  IF array_length(fields, 1) != 5 THEN
    RAISE WARNING 'Invalid cron expression (expected 5 fields): %', cron_expression;
    RETURN false;
  END IF;

  now_ts := date_trunc('minute', now());
  curr_minute := extract(minute FROM now_ts)::INTEGER;
  curr_hour := extract(hour FROM now_ts)::INTEGER;
  curr_dom := extract(day FROM now_ts)::INTEGER;
  curr_month := extract(month FROM now_ts)::INTEGER;
  -- PostgreSQL: 0=Sunday, 6=Saturday (matches standard cron)
  curr_dow := extract(dow FROM now_ts)::INTEGER;

  RETURN cron_field_matches(fields[1], curr_minute, 0, 59)
     AND cron_field_matches(fields[2], curr_hour, 0, 23)
     AND cron_field_matches(fields[3], curr_dom, 1, 31)
     AND cron_field_matches(fields[4], curr_month, 1, 12)
     AND cron_field_matches(fields[5], curr_dow, 0, 6);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- CHECK DUE WORKFLOWS (main scheduler loop)
-- ============================================
-- Called every minute by pg_cron. Finds active scheduled workflows whose cron
-- expression matches now, prevents duplicate dispatch for the same minute,
-- and dispatches via pg_net HTTP POST to the workflow-executor edge function.

CREATE OR REPLACE FUNCTION check_due_workflows()
RETURNS void AS $$
DECLARE
  wf RECORD;
  this_minute TIMESTAMPTZ;
  supabase_url TEXT;
  scheduler_secret TEXT;
  dispatch_url TEXT;
  already_dispatched BOOLEAN;
  request_id BIGINT;
BEGIN
  this_minute := date_trunc('minute', now());
  supabase_url := current_setting('app.supabase_url', true);
  scheduler_secret := current_setting('app.scheduler_secret', true);

  -- If not configured, log warning and exit
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING 'app.supabase_url not set — skipping workflow dispatch';
    RETURN;
  END IF;

  IF scheduler_secret IS NULL OR scheduler_secret = '' THEN
    RAISE WARNING 'app.scheduler_secret not set — skipping workflow dispatch';
    RETURN;
  END IF;

  dispatch_url := supabase_url || '/functions/v1/workflow-executor';

  FOR wf IN
    SELECT id, name, trigger_config
    FROM workflows
    WHERE is_active = true
      AND trigger_type = 'scheduled'
      AND trigger_config->>'cron' IS NOT NULL
      AND cron_matches_now(trigger_config->>'cron')
  LOOP
    -- Prevent duplicate dispatch for same workflow + minute
    SELECT EXISTS(
      SELECT 1
      FROM scheduled_workflow_runs
      WHERE workflow_id = wf.id
        AND scheduled_at = this_minute
    ) INTO already_dispatched;

    IF already_dispatched THEN
      CONTINUE;
    END IF;

    -- Record the scheduled run
    INSERT INTO scheduled_workflow_runs (workflow_id, scheduled_at, status)
    VALUES (wf.id, this_minute, 'pending');

    -- Dispatch via pg_net
    BEGIN
      SELECT net.http_post(
        url := dispatch_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-scheduler-secret', scheduler_secret
        ),
        body := jsonb_build_object(
          'workflow_id', wf.id,
          'trigger_type', 'scheduled',
          'trigger_data', jsonb_build_object(
            'scheduled_at', this_minute,
            'cron', wf.trigger_config->>'cron'
          )
        )
      ) INTO request_id;

      -- Mark as dispatched
      UPDATE scheduled_workflow_runs
      SET status = 'dispatched',
          dispatched_at = now()
      WHERE workflow_id = wf.id
        AND scheduled_at = this_minute;

      -- Audit log
      INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
      VALUES (
        'scheduler', NULL, 'workflow.dispatched', 'workflow', wf.id::TEXT,
        jsonb_build_object(
          'workflow_name', wf.name,
          'scheduled_at', this_minute,
          'cron', wf.trigger_config->>'cron',
          'pg_net_request_id', request_id
        )
      );

    EXCEPTION WHEN OTHERS THEN
      -- Mark as failed
      UPDATE scheduled_workflow_runs
      SET status = 'failed',
          error = SQLERRM
      WHERE workflow_id = wf.id
        AND scheduled_at = this_minute;

      RAISE WARNING 'Failed to dispatch workflow %: %', wf.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CLEANUP OLD SCHEDULED RUNS
-- ============================================
-- Purge records older than 30 days to prevent table bloat.

CREATE OR REPLACE FUNCTION cleanup_old_scheduled_runs()
RETURNS void AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM scheduled_workflow_runs
  WHERE created_at < now() - interval '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    INSERT INTO audit_log (actor_type, action, resource_type, details)
    VALUES (
      'system', 'scheduled_runs.cleanup', 'scheduled_workflow_runs',
      jsonb_build_object('deleted_count', deleted_count)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CRON JOB SCHEDULES
-- ============================================

-- Check for due workflows every minute
SELECT cron.schedule(
  'check-due-workflows',
  '* * * * *',
  $$SELECT check_due_workflows()$$
);

-- Cleanup old scheduled run records every Sunday at 3 AM UTC
SELECT cron.schedule(
  'cleanup-scheduled-runs',
  '0 3 * * 0',
  $$SELECT cleanup_old_scheduled_runs()$$
);

-- Create next month's audit_log partition on the 25th of each month
SELECT cron.schedule(
  'create-audit-log-partition',
  '0 0 25 * *',
  $$SELECT create_audit_log_partition()$$
);

-- ============================================
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Scheduler migration completed successfully';
  RAISE NOTICE 'Table created: scheduled_workflow_runs';
  RAISE NOTICE 'Functions created: cron_field_matches(), cron_matches_now(), check_due_workflows(), cleanup_old_scheduled_runs()';
  RAISE NOTICE 'Cron jobs scheduled: check-due-workflows (every minute), cleanup-scheduled-runs (Sundays 3AM), create-audit-log-partition (25th monthly)';
END $$;
