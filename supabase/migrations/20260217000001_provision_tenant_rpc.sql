-- =====================================================================
-- MIGRATION: Tenant Provisioning RPC
-- Issue: #299 - Tenant provisioning automation
--
-- Creates app.provision_tenant() — an atomic function that:
-- 1. Validates slug uniqueness (raises exception if taken)
-- 2. Inserts into app.tenants
-- 3. Inserts admin into admin_users
-- 4. Seeds 5 default filesystem folders (Desktop, Applications, Documents, Downloads, Trash)
-- 5. Returns (tenant_id, created_at)
-- =====================================================================

BEGIN;

-- ============================================
-- provision_tenant RPC
-- ============================================

CREATE OR REPLACE FUNCTION app.provision_tenant(
  p_name         TEXT,
  p_slug         TEXT,
  p_type         TEXT DEFAULT 'organization',
  p_admin_email  TEXT DEFAULT NULL,
  p_plan         TEXT DEFAULT 'free',
  p_branding     JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(tenant_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
DECLARE
  v_tenant_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- 1. Validate slug uniqueness
  IF EXISTS (SELECT 1 FROM app.tenants t WHERE t.slug = p_slug) THEN
    RAISE EXCEPTION 'Tenant slug "%" is already taken', p_slug
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Validate inputs
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Tenant name is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RAISE EXCEPTION 'Tenant slug is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_slug !~ '^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$' THEN
    RAISE EXCEPTION 'Tenant slug must be lowercase alphanumeric with hyphens, 3-100 chars'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Insert tenant
  INSERT INTO app.tenants (name, slug, type, hierarchy_path, settings, is_active)
  VALUES (
    trim(p_name),
    trim(p_slug),
    p_type,
    trim(p_slug)::ltree,
    jsonb_build_object(
      'plan', p_plan,
      'branding', p_branding,
      'provisioning_status', 'active',
      'provisioned_at', now()::text
    ),
    true
  )
  RETURNING id, app.tenants.created_at
  INTO v_tenant_id, v_created_at;

  -- 3. Insert admin user (if email provided)
  IF p_admin_email IS NOT NULL AND length(trim(p_admin_email)) > 0 THEN
    INSERT INTO public.admin_users (email, tenant_id)
    VALUES (trim(p_admin_email), v_tenant_id)
    ON CONFLICT (email, tenant_id) DO NOTHING;
  END IF;

  -- 4. Seed default filesystem folders
  INSERT INTO public.desktop_filesystem (tenant_id, parent_id, name, type, icon, metadata)
  VALUES
    (v_tenant_id, NULL, 'Desktop',      'folder', 'monitor',        '{"system": true}'::jsonb),
    (v_tenant_id, NULL, 'Applications', 'folder', 'grid',           '{"system": true}'::jsonb),
    (v_tenant_id, NULL, 'Documents',    'folder', 'file-text',      '{"system": true}'::jsonb),
    (v_tenant_id, NULL, 'Downloads',    'folder', 'download',       '{"system": true}'::jsonb),
    (v_tenant_id, NULL, 'Trash',        'folder', 'trash-2',        '{"system": true}'::jsonb);

  -- 5. Return result
  RETURN QUERY SELECT v_tenant_id, v_created_at;
END;
$$;

-- Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION app.provision_tenant(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB)
  TO service_role;

COMMENT ON FUNCTION app.provision_tenant IS
  'Atomically provisions a new tenant with admin user and default filesystem folders. Issue #299.';

COMMIT;
