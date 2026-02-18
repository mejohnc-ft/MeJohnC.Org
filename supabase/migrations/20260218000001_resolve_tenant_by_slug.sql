-- =====================================================================
-- MIGRATION: Resolve Tenant by Slug RPC
-- Issue: #300 - Subdomain routing for tenant resolution
--
-- Creates app.resolve_tenant_by_slug() — a SECURITY DEFINER function
-- that allows anonymous users to look up a tenant by slug.
--
-- This is needed because RLS on app.tenants blocks anonymous reads,
-- creating a chicken-and-egg problem: we can't set tenant context
-- without first knowing the tenant ID.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION app.resolve_tenant_by_slug(p_slug TEXT)
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
    WHERE t.slug = p_slug
      AND t.is_active = true
    LIMIT 1;
END;
$$;

-- Grant execute to both anon (pre-login subdomain resolution) and authenticated
GRANT EXECUTE ON FUNCTION app.resolve_tenant_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION app.resolve_tenant_by_slug(TEXT) TO authenticated;

COMMENT ON FUNCTION app.resolve_tenant_by_slug IS
  'Resolve an active tenant by slug for subdomain routing. SECURITY DEFINER bypasses RLS. Issue #300.';

COMMIT;
