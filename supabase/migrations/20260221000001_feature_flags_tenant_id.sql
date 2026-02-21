-- Add tenant_id to feature_flags for per-tenant scoping
-- Issue: #311

DO $$
BEGIN
  -- Only run if the table exists in this environment
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'feature_flags') THEN
    ALTER TABLE app.feature_flags
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES app.tenants(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant_id
      ON app.feature_flags(tenant_id);

    DROP POLICY IF EXISTS "Feature flags are readable by tenant members" ON app.feature_flags;
    CREATE POLICY "Feature flags are readable by tenant members"
      ON app.feature_flags FOR SELECT
      USING (
        tenant_id IS NULL
        OR tenant_id = app.current_tenant_id()
      );
  ELSE
    RAISE NOTICE 'app.feature_flags does not exist, skipping tenant_id migration';
  END IF;
END $$;
