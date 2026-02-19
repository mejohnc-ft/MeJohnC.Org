-- =====================================================================
-- REPAIR MIGRATION: Ensure app schema prerequisites exist
--
-- The app schema, tenants table, and helper functions were defined in
-- 004_multi_tenant.sql which is recorded as applied but was never
-- executed against the remote database.  This idempotent migration
-- creates the missing objects so that subsequent migrations
-- (20240601000012_fix_tenant_security, 20260217000001_provision_tenant_rpc)
-- can reference them.
--
-- Every statement uses IF NOT EXISTS / CREATE OR REPLACE so this is
-- safe to run even if the objects already exist.
-- =====================================================================

BEGIN;

-- Enable ltree extension (Supabase has it available but schema may need it)
CREATE EXTENSION IF NOT EXISTS ltree;

-- 1. Create app schema
CREATE SCHEMA IF NOT EXISTS app;

-- 2. Create default_tenant_id() helper
CREATE OR REPLACE FUNCTION app.default_tenant_id()
RETURNS UUID AS $$
  SELECT '00000000-0000-0000-0000-000000000001'::UUID;
$$ LANGUAGE SQL IMMUTABLE;

-- 3. Create tenants table
CREATE TABLE IF NOT EXISTS app.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'account'
    CHECK (type IN ('platform', 'organization', 'account', 'user')),
  hierarchy_path ltree,
  parent_id UUID REFERENCES app.tenants(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_hierarchy ON app.tenants USING GIST (hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON app.tenants(parent_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON app.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_type ON app.tenants(type);

-- 5. Insert default tenant
INSERT INTO app.tenants (id, name, slug, type, hierarchy_path, is_active)
VALUES (
  app.default_tenant_id(),
  'Default Tenant',
  'default',
  'account',
  'default'::ltree,
  true
)
ON CONFLICT (id) DO NOTHING;

-- 6. RLS helper: current_tenant_id()
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.tenant_id', true), '')::UUID,
    app.default_tenant_id()
  );
$$ LANGUAGE SQL STABLE;

-- 7. RLS helper: can_access_tenant()
CREATE OR REPLACE FUNCTION app.can_access_tenant(target_hierarchy ltree)
RETURNS BOOLEAN AS $$
DECLARE
  current_hierarchy ltree;
BEGIN
  SELECT hierarchy_path INTO current_hierarchy
  FROM app.tenants
  WHERE id = app.current_tenant_id();

  IF current_hierarchy IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN target_hierarchy <@ current_hierarchy OR target_hierarchy = current_hierarchy;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 8. Context helpers
CREATE OR REPLACE FUNCTION app.set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app.clear_tenant_context()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Enable RLS on tenants (idempotent)
ALTER TABLE app.tenants ENABLE ROW LEVEL SECURITY;

-- 10. Tenants table policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'app' AND tablename = 'tenants'
      AND policyname = 'Users can view their own tenant'
  ) THEN
    CREATE POLICY "Users can view their own tenant" ON app.tenants
      FOR SELECT USING (
        id = app.current_tenant_id() OR
        app.can_access_tenant(hierarchy_path)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'app' AND tablename = 'tenants'
      AND policyname = 'Admins can manage tenants'
  ) THEN
    CREATE POLICY "Admins can manage tenants" ON app.tenants
      FOR ALL USING (is_admin());
  END IF;
END $$;

COMMIT;
