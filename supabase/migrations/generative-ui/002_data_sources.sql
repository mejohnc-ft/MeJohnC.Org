-- ============================================
-- Generative UI: Data Sources Table
-- ============================================
-- Standalone data sources that can be bound to panels
-- @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/258

CREATE TABLE IF NOT EXISTS genui_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('metrics', 'supabase', 'api', 'static')),
  endpoint TEXT,
  table_name TEXT,
  api_key TEXT,
  refresh_interval_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_genui_data_sources_tenant ON genui_data_sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_genui_data_sources_type ON genui_data_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_genui_data_sources_active ON genui_data_sources(is_active) WHERE is_active = true;

ALTER TABLE genui_data_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS genui_data_sources_admin_all ON genui_data_sources;
CREATE POLICY genui_data_sources_admin_all ON genui_data_sources
  FOR ALL USING (is_admin());

DROP TRIGGER IF EXISTS genui_data_sources_updated_at ON genui_data_sources;
CREATE TRIGGER genui_data_sources_updated_at
  BEFORE UPDATE ON genui_data_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
