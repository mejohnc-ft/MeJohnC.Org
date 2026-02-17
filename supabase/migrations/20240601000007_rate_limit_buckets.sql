-- Migration: Persistent Rate Limit Buckets
-- Issue: #181 - In-memory rate limiting resets on every cold start
--
-- Creates a table and atomic RPC for persistent rate limiting that survives
-- edge function cold starts. Uses advisory locks for concurrency safety.

-- Rate limit buckets table
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_window_start
  ON rate_limit_buckets (window_start);

-- Atomic check-and-increment rate limit function
-- Returns: allowed (boolean), remaining (integer), reset_at (timestamptz), retry_after_seconds (integer)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_window_ms INTEGER DEFAULT 60000,
  p_max_requests INTEGER DEFAULT 100
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window_interval INTERVAL := (p_window_ms || ' milliseconds')::INTERVAL;
  v_entry RECORD;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Upsert: insert or update the bucket atomically
  INSERT INTO rate_limit_buckets (key, count, window_start, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      -- Window expired: reset to 1
      WHEN rate_limit_buckets.window_start + (p_window_ms || ' milliseconds')::INTERVAL <= v_now
        THEN 1
      -- Window active: increment
      ELSE rate_limit_buckets.count + 1
    END,
    window_start = CASE
      -- Window expired: reset window
      WHEN rate_limit_buckets.window_start + (p_window_ms || ' milliseconds')::INTERVAL <= v_now
        THEN v_now
      -- Window active: keep existing
      ELSE rate_limit_buckets.window_start
    END,
    updated_at = v_now
  RETURNING * INTO v_entry;

  v_reset_at := v_entry.window_start + v_window_interval;

  IF v_entry.count > p_max_requests THEN
    -- Over limit: roll back the increment
    UPDATE rate_limit_buckets SET count = count - 1 WHERE rate_limit_buckets.key = p_key;
    RETURN QUERY SELECT
      FALSE,
      0,
      v_reset_at,
      GREATEST(1, EXTRACT(EPOCH FROM (v_reset_at - v_now))::INTEGER);
  ELSE
    RETURN QUERY SELECT
      TRUE,
      p_max_requests - v_entry.count,
      v_reset_at,
      NULL::INTEGER;
  END IF;
END;
$$;

-- Cleanup function to remove expired buckets (call periodically or via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_buckets(p_max_age_ms INTEGER DEFAULT 300000)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limit_buckets
  WHERE window_start < NOW() - (p_max_age_ms || ' milliseconds')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- RLS: Only service role can access rate limit buckets
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- No policies = only service role key can access (which is what edge functions use)
