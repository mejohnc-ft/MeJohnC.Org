-- Billing RPCs for Stripe integration
-- Issue: #301
--
-- Two SECURITY DEFINER RPCs called by Netlify Functions (service_role only):
-- 1. link_stripe_customer — stores Stripe customer ID in tenant settings
-- 2. update_tenant_billing — atomically merges billing fields into tenant settings JSONB

-- ── link_stripe_customer ──────────────────────────────────────────────────────
-- Called during Stripe Checkout creation to persist the Stripe customer ID
-- so webhooks can later locate the tenant by customer ID.

CREATE OR REPLACE FUNCTION app.link_stripe_customer(
  p_tenant_id   UUID,
  p_stripe_customer_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
BEGIN
  UPDATE app.tenants
  SET settings = settings || jsonb_build_object('stripe_customer_id', p_stripe_customer_id),
      updated_at = now()
  WHERE id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
  END IF;
END;
$$;

-- ── update_tenant_billing ─────────────────────────────────────────────────────
-- Called by Stripe webhooks to update billing state.
-- Finds the tenant by stripe_customer_id stored in settings JSONB.

CREATE OR REPLACE FUNCTION app.update_tenant_billing(
  p_stripe_customer_id     TEXT,
  p_stripe_subscription_id TEXT,
  p_plan                   TEXT,
  p_subscription_status    TEXT,
  p_current_period_end     TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
BEGIN
  UPDATE app.tenants
  SET settings = settings || jsonb_build_object(
        'stripe_subscription_id', p_stripe_subscription_id,
        'plan',                   p_plan,
        'subscription_status',    p_subscription_status,
        'current_period_end',     p_current_period_end
      ),
      updated_at = now()
  WHERE settings->>'stripe_customer_id' = p_stripe_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tenant with stripe_customer_id %', p_stripe_customer_id;
  END IF;
END;
$$;

-- Grant execute to service_role only (Netlify Functions use this role)
REVOKE ALL ON FUNCTION app.link_stripe_customer(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.link_stripe_customer(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION app.update_tenant_billing(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.update_tenant_billing(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
