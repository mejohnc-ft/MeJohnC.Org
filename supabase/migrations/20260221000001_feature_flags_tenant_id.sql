-- Add tenant_id to feature_flags for per-tenant scoping
-- Issue: #311

ALTER TABLE IF EXISTS app.feature_flags
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES app.tenants(id) ON DELETE CASCADE;

-- Index for efficient tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant_id
  ON app.feature_flags(tenant_id);

-- Update RLS policy to scope by tenant (global flags have NULL tenant_id)
-- Existing policy may already exist; drop and recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Feature flags are readable by tenant members" ON app.feature_flags;
  CREATE POLICY "Feature flags are readable by tenant members"
    ON app.feature_flags FOR SELECT
    USING (
      tenant_id IS NULL
      OR tenant_id = app.current_tenant_id()
    );
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist yet in this env; skip
  NULL;
END $$;
