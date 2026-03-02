-- =====================================================================
-- MIGRATION: Custom Domain Support
-- Issue: #313 - BYO domain + domain procurement for tenants
--
-- 1. Adds custom_domain column to app.tenants for indexed hostname
--    resolution (JSONB path is not practically indexable for per-request
--    hostname lookups).
-- 2. Creates resolve_tenant_by_domain() — mirrors resolve_tenant_by_slug
--    pattern for custom domain hostname resolution.
-- 3. Creates set_tenant_custom_domain() — service_role-only RPC that
--    keeps the column and JSONB settings in sync.
-- =====================================================================

BEGIN;

-- 1. Add custom_domain column (VARCHAR 253 = max DNS name length)
ALTER TABLE app.tenants
  ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(253) DEFAULT NULL;

-- Partial unique index — only one tenant per domain, NULLs are ignored
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_custom_domain
  ON app.tenants(custom_domain)
  WHERE custom_domain IS NOT NULL;

-- 2. Resolve tenant by custom domain (mirrors resolve_tenant_by_slug)
CREATE OR REPLACE FUNCTION app.resolve_tenant_by_domain(p_domain TEXT)
RETURNS TABLE(
  id UUID,
  name VARCHAR(255),
  slug VARCHAR(100),
  type VARCHAR(50),
  is_active BOOLEAN,
  settings JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
BEGIN
  RETURN QUERY
    SELECT t.id, t.name, t.slug, t.type, t.is_active, t.settings
    FROM app.tenants t
    WHERE t.custom_domain = lower(p_domain)
      AND t.is_active = true
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION app.resolve_tenant_by_domain(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION app.resolve_tenant_by_domain(TEXT) TO authenticated;

COMMENT ON FUNCTION app.resolve_tenant_by_domain IS
  'Resolve an active tenant by custom domain for hostname routing. SECURITY DEFINER bypasses RLS. Issue #313.';

-- 3. Set (or clear) a tenant custom domain — service_role only
--    Keeps the column and JSONB settings.domain.custom_domain in sync.
CREATE OR REPLACE FUNCTION app.set_tenant_custom_domain(
  p_tenant_id UUID,
  p_domain TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
DECLARE
  v_lower TEXT := lower(p_domain);
BEGIN
  -- Set the indexed column
  UPDATE app.tenants
  SET custom_domain = v_lower,
      settings = jsonb_set(
        COALESCE(settings, '{}'),
        '{domain,custom_domain}',
        CASE WHEN v_lower IS NULL THEN 'null'::JSONB
             ELSE to_jsonb(v_lower)
        END
      ),
      updated_at = now()
  WHERE id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
  END IF;
END;
$$;

-- Only service_role should call this (via Netlify function)
REVOKE ALL ON FUNCTION app.set_tenant_custom_domain(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.set_tenant_custom_domain(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION app.set_tenant_custom_domain IS
  'Set or clear a tenant custom domain. Keeps column + JSONB in sync. Service-role only. Issue #313.';

COMMIT;
