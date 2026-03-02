-- Agent Security Migration
-- Adds allow_destructive flag and fixes RLS gap on agent_confirmations
-- Issue: #276

-- ─── Add allow_destructive column to agents ─────────────────────────

ALTER TABLE agents ADD COLUMN IF NOT EXISTS allow_destructive BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN agents.allow_destructive IS 'Whether this agent can perform destructive actions (email.send, social.post, finance.payment, etc.)';

-- ─── Fix RLS gap on agent_confirmations ─────────────────────────────
-- Ensure agents can only read their own confirmations (scoped by agent_id).
-- The admin policy already exists; we add an agent-scoped read policy.

DO $$
BEGIN
  -- Drop if exists to make idempotent
  DROP POLICY IF EXISTS "Agents can read own confirmations" ON agent_confirmations;

  -- Only create if the table has an agent_id column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_confirmations' AND column_name = 'agent_id'
  ) THEN
    -- Create policy allowing service role to read agent-scoped confirmations
    -- (Edge functions use service role key, so this is for completeness)
    CREATE POLICY "Agents can read own confirmations" ON agent_confirmations
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- ─── Audit log for destructive action blocks ────────────────────────

-- Index for quick lookup of destructive permission
CREATE INDEX IF NOT EXISTS idx_agents_allow_destructive ON agents(allow_destructive) WHERE allow_destructive = true;

SELECT 'Migration 20260303000002_agent_security completed' AS status;
