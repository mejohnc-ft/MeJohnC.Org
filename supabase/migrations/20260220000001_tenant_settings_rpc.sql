-- Tenant Settings RPC
-- Issue: #302
--
-- SECURITY DEFINER RPC called by authenticated tenant admins to update
-- branding, enabled apps, dock pins, domain, and email settings.
-- Merges non-null params into the tenant's settings JSONB column.

CREATE OR REPLACE FUNCTION app.update_tenant_settings(
  p_branding     JSONB DEFAULT NULL,
  p_enabled_apps JSONB DEFAULT NULL,
  p_dock_pinned  JSONB DEFAULT NULL,
  p_domain       JSONB DEFAULT NULL,
  p_email        JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
DECLARE
  v_tenant_id UUID;
  v_merged    JSONB;
  v_patch     JSONB := '{}'::JSONB;
BEGIN
  -- Verify caller is an admin for the current tenant
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: caller is not a tenant admin';
  END IF;

  v_tenant_id := app.current_tenant_id();

  -- Build patch from non-null parameters
  IF p_branding IS NOT NULL THEN
    v_patch := v_patch || jsonb_build_object('branding', p_branding);
  END IF;

  IF p_enabled_apps IS NOT NULL THEN
    v_patch := v_patch || jsonb_build_object('enabled_apps', p_enabled_apps);
  END IF;

  IF p_dock_pinned IS NOT NULL THEN
    v_patch := v_patch || jsonb_build_object('dock_pinned', p_dock_pinned);
  END IF;

  IF p_domain IS NOT NULL THEN
    v_patch := v_patch || jsonb_build_object('domain', p_domain);
  END IF;

  IF p_email IS NOT NULL THEN
    v_patch := v_patch || jsonb_build_object('email', p_email);
  END IF;

  -- Merge into existing settings
  UPDATE app.tenants
  SET settings = COALESCE(settings, '{}') || v_patch,
      updated_at = now()
  WHERE id = v_tenant_id
  RETURNING settings INTO v_merged;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found', v_tenant_id;
  END IF;

  RETURN v_merged;
END;
$$;

-- Grant to authenticated role (RLS + is_admin() guard access)
REVOKE ALL ON FUNCTION app.update_tenant_settings(JSONB, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.update_tenant_settings(JSONB, JSONB, JSONB, JSONB, JSONB) TO authenticated;
