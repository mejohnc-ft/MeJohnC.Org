-- Ensure app schema and core tenant infrastructure exist
-- This is a safety net for environments where the foundation migration
-- was marked as applied but the app schema was never actually created
-- (e.g. due to FULL_MIGRATION.sql having been run instead).
-- All statements are idempotent.

CREATE EXTENSION IF NOT EXISTS ltree;

-- ============================================
-- APP SCHEMA & HELPERS
-- ============================================

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.default_tenant_id()
RETURNS UUID AS $$
  SELECT '00000000-0000-0000-0000-000000000001'::UUID;
$$ LANGUAGE SQL IMMUTABLE;

-- ============================================
-- TENANTS TABLE
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_tenants_hierarchy ON app.tenants USING GIST (hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON app.tenants(parent_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON app.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_type ON app.tenants(type);

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

ALTER TABLE app.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TENANT CONTEXT FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.tenant_id', true), '')::UUID,
    app.default_tenant_id()
  );
$$ LANGUAGE SQL STABLE;

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

-- ============================================
-- ADMIN_USERS TENANT SCOPING
-- ============================================
-- The 20240601000012 fix_tenant_security migration never applied
-- (blocked by the broken 11a migration). Add tenant_id to admin_users
-- so is_admin() can be tenant-scoped.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT app.default_tenant_id()
  REFERENCES app.tenants(id);

CREATE INDEX IF NOT EXISTS idx_admin_users_tenant ON admin_users(tenant_id);

-- Replace single-email unique with composite (email, tenant_id)
-- so the same email can be admin of multiple tenants
DO $$ BEGIN
  ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_email_key;
  ALTER TABLE admin_users ADD CONSTRAINT admin_users_email_tenant_unique
    UNIQUE (email, tenant_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================
-- TENANT-SCOPED is_admin()
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
      AND tenant_id = app.current_tenant_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
