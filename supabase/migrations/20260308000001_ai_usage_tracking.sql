-- AI Usage Tracking
-- Issue: #314
--
-- Tracks per-tenant AI interactions for quota enforcement and metered billing.
-- Adds:
--   1. tenant_ai_usage table — logs every AI interaction
--   2. get_tenant_ai_usage_count RPC — returns count of interactions since a given timestamp
--   3. Updates update_tenant_billing to also store current_period_start

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app.tenant_ai_usage (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  model         TEXT        NOT NULL,
  prompt_tokens INT         DEFAULT 0,
  completion_tokens INT     DEFAULT 0,
  total_tokens  INT         DEFAULT 0,
  feature       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tenant_ai_usage_tenant_created
  ON app.tenant_ai_usage (tenant_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE app.tenant_ai_usage ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own tenant's usage
CREATE POLICY tenant_ai_usage_read ON app.tenant_ai_usage
  FOR SELECT TO authenticated
  USING (tenant_id = app.current_tenant_id());

-- Service role can insert (ai-proxy function inserts usage rows)
CREATE POLICY tenant_ai_usage_service_insert ON app.tenant_ai_usage
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ── RPC: get_tenant_ai_usage_count ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION app.get_tenant_ai_usage_count(
  p_tenant_id    UUID,
  p_period_start TIMESTAMPTZ
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
DECLARE
  usage_count BIGINT;
BEGIN
  SELECT COUNT(*)
  INTO usage_count
  FROM app.tenant_ai_usage
  WHERE tenant_id = p_tenant_id
    AND created_at >= p_period_start;

  RETURN COALESCE(usage_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION app.get_tenant_ai_usage_count(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION app.get_tenant_ai_usage_count(UUID, TIMESTAMPTZ) TO service_role;

-- ── Update update_tenant_billing to include current_period_start ─────────────
-- Drop old 5-param signature and recreate with 6 params.

DROP FUNCTION IF EXISTS app.update_tenant_billing(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION app.update_tenant_billing(
  p_stripe_customer_id     TEXT,
  p_stripe_subscription_id TEXT,
  p_plan                   TEXT,
  p_subscription_status    TEXT,
  p_current_period_end     TIMESTAMPTZ,
  p_current_period_start   TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
DECLARE
  billing_obj JSONB;
BEGIN
  billing_obj := jsonb_build_object(
    'stripe_subscription_id', p_stripe_subscription_id,
    'plan',                   p_plan,
    'subscription_status',    p_subscription_status,
    'current_period_end',     p_current_period_end
  );

  IF p_current_period_start IS NOT NULL THEN
    billing_obj := billing_obj || jsonb_build_object(
      'current_period_start', p_current_period_start
    );
  END IF;

  UPDATE app.tenants
  SET settings = settings || billing_obj,
      updated_at = now()
  WHERE settings->>'stripe_customer_id' = p_stripe_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tenant with stripe_customer_id %', p_stripe_customer_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION app.update_tenant_billing(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.update_tenant_billing(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
