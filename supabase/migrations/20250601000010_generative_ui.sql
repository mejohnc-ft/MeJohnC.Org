-- Generative UI Migration
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql and 004_multi_tenant.sql must be applied first
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE EXCEPTION 'Missing prerequisite: is_admin() function. Run schema.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    RAISE EXCEPTION 'Missing prerequisite: update_updated_at_column() function. Run schema.sql first.';
  END IF;
END $$;

-- ============================================
-- GENERATIVE UI TABLES
-- ============================================

-- Panels: Store generated UI panels
CREATE TABLE IF NOT EXISTS genui_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  generated_ui JSONB NOT NULL DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, slug)
);

-- Component Catalog: Define available component types and their schemas
CREATE TABLE IF NOT EXISTS genui_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  component_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  icon TEXT,
  props_schema JSONB NOT NULL DEFAULT '{}',
  default_props JSONB NOT NULL DEFAULT '{}',
  example_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, component_type)
);

-- Generation History: Track AI generation requests and responses
CREATE TABLE IF NOT EXISTS genui_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  panel_id UUID REFERENCES genui_panels(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  generated_ui JSONB NOT NULL DEFAULT '{}',
  model TEXT DEFAULT 'claude-3-sonnet',
  tokens_used INTEGER DEFAULT 0,
  generation_time_ms INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Templates: Pre-built panel templates for quick start
CREATE TABLE IF NOT EXISTS genui_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  thumbnail_url TEXT,
  prompt TEXT NOT NULL,
  generated_ui JSONB NOT NULL DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Data Bindings: Connect panels to live data sources
CREATE TABLE IF NOT EXISTS genui_data_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID NOT NULL REFERENCES genui_panels(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  binding_path TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('metrics', 'supabase', 'api', 'static')),
  source_config JSONB NOT NULL DEFAULT '{}',
  refresh_interval_seconds INTEGER DEFAULT 60,
  last_value JSONB,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(panel_id, node_id, binding_path)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_genui_panels_tenant ON genui_panels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_genui_panels_slug ON genui_panels(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_genui_panels_published ON genui_panels(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_genui_panels_created_by ON genui_panels(created_by);
CREATE INDEX IF NOT EXISTS idx_genui_panels_deleted ON genui_panels(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_genui_catalog_tenant ON genui_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_genui_catalog_type ON genui_catalog(component_type);
CREATE INDEX IF NOT EXISTS idx_genui_catalog_category ON genui_catalog(category);

CREATE INDEX IF NOT EXISTS idx_genui_generations_tenant ON genui_generations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_genui_generations_panel ON genui_generations(panel_id);
CREATE INDEX IF NOT EXISTS idx_genui_generations_created ON genui_generations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_genui_templates_tenant ON genui_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_genui_templates_category ON genui_templates(category);
CREATE INDEX IF NOT EXISTS idx_genui_templates_featured ON genui_templates(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_genui_data_bindings_panel ON genui_data_bindings(panel_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS genui_panels_updated_at ON genui_panels;
CREATE TRIGGER genui_panels_updated_at
  BEFORE UPDATE ON genui_panels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS genui_catalog_updated_at ON genui_catalog;
CREATE TRIGGER genui_catalog_updated_at
  BEFORE UPDATE ON genui_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS genui_templates_updated_at ON genui_templates;
CREATE TRIGGER genui_templates_updated_at
  BEFORE UPDATE ON genui_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS genui_data_bindings_updated_at ON genui_data_bindings;
CREATE TRIGGER genui_data_bindings_updated_at
  BEFORE UPDATE ON genui_data_bindings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE genui_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE genui_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE genui_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE genui_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE genui_data_bindings ENABLE ROW LEVEL SECURITY;

-- Panels: Public read for published, admin full access
DROP POLICY IF EXISTS genui_panels_public_read ON genui_panels;
CREATE POLICY genui_panels_public_read ON genui_panels
  FOR SELECT USING (is_published = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS genui_panels_admin_all ON genui_panels;
CREATE POLICY genui_panels_admin_all ON genui_panels
  FOR ALL USING (is_admin());

-- Catalog: Public read, admin write
DROP POLICY IF EXISTS genui_catalog_public_read ON genui_catalog;
CREATE POLICY genui_catalog_public_read ON genui_catalog
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS genui_catalog_admin_all ON genui_catalog;
CREATE POLICY genui_catalog_admin_all ON genui_catalog
  FOR ALL USING (is_admin());

-- Generations: Admin only
DROP POLICY IF EXISTS genui_generations_admin_all ON genui_generations;
CREATE POLICY genui_generations_admin_all ON genui_generations
  FOR ALL USING (is_admin());

-- Templates: Public read, admin write
DROP POLICY IF EXISTS genui_templates_public_read ON genui_templates;
CREATE POLICY genui_templates_public_read ON genui_templates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS genui_templates_admin_all ON genui_templates;
CREATE POLICY genui_templates_admin_all ON genui_templates
  FOR ALL USING (is_admin());

-- Data Bindings: Admin only
DROP POLICY IF EXISTS genui_data_bindings_admin_all ON genui_data_bindings;
CREATE POLICY genui_data_bindings_admin_all ON genui_data_bindings
  FOR ALL USING (is_admin());

-- ============================================
-- SEED DEFAULT CATALOG COMPONENTS
-- ============================================

INSERT INTO genui_catalog (component_type, display_name, description, category, icon, props_schema, default_props, example_prompt, sort_order)
VALUES
  ('StatCard', 'Stat Card', 'Hero statistic display with gradient accent', 'metrics', 'trending-up',
   '{"value": "string", "label": "string", "color": "enum:green,blue,orange,red", "trend": "enum:up,down,flat", "trendValue": "string?"}',
   '{"value": "0", "label": "Metric", "color": "green"}',
   'Show a stat card with revenue of $52K, green color, trending up 12%', 10),

  ('StatGrid', 'Stat Grid', 'Responsive grid of stat cards', 'metrics', 'layout-grid',
   '{"stats": "array", "columns": "number:1-4"}',
   '{"stats": [], "columns": 4}',
   'Create a 4-column grid with revenue, users, orders, and growth stats', 11),

  ('CommandPalette', 'Command Palette', 'Grouped command interface', 'navigation', 'terminal',
   '{"groups": "array"}',
   '{"groups": []}',
   'Build a command palette with deployment, database, and monitoring commands', 20),

  ('Carousel3D', '3D Carousel', 'Flywheel-style rotating card carousel', 'showcase', 'rotate-3d',
   '{"cards": "array", "autoRotate": "boolean", "rotationSpeed": "number:1-10"}',
   '{"cards": [], "autoRotate": false, "rotationSpeed": 5}',
   'Create a 3D carousel showcasing product features', 30),

  ('MetricChart', 'Metric Chart', 'Data visualization chart', 'metrics', 'line-chart',
   '{"metricName": "string", "chartType": "enum:line,bar,area,sparkline", "timeRange": "enum:1h,24h,7d,30d,90d", "color": "enum:green,blue,orange,red"}',
   '{"metricName": "Performance", "chartType": "line", "timeRange": "7d", "color": "green"}',
   'Show a line chart of revenue over the last 7 days', 12),

  ('DataTable', 'Data Table', 'Tabular data display', 'data', 'table',
   '{"columns": "array", "sortBy": "string?", "limit": "number:1-100"}',
   '{"columns": [], "limit": 10}',
   'Display a table of recent orders with date, customer, and amount columns', 13),

  ('ColorPalette', 'Color Palette', 'Brand color display', 'style', 'palette',
   '{"showValues": "boolean", "showUsage": "boolean", "interactive": "boolean"}',
   '{"showValues": true, "showUsage": true, "interactive": true}',
   'Show the CentrexStyle brand color palette', 40),

  ('Hero', 'Hero Section', 'Full-width hero section', 'layout', 'layout',
   '{"headline": "string", "subheadline": "string?", "layout": "enum:centered,left,right,split", "ctaText": "string?", "ctaLink": "string?"}',
   '{"headline": "Welcome", "layout": "centered"}',
   'Create a hero section for a SaaS landing page', 1),

  ('Features', 'Features Grid', 'Feature grid or list', 'layout', 'grid-3x3',
   '{"layout": "enum:grid,list,cards", "items": "array", "columns": "number:1-4"}',
   '{"layout": "grid", "items": [], "columns": 3}',
   'Show a 3-column grid of product features with icons', 2)

ON CONFLICT (tenant_id, component_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  props_schema = EXCLUDED.props_schema,
  default_props = EXCLUDED.default_props,
  example_prompt = EXCLUDED.example_prompt,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ============================================
-- SEED STARTER TEMPLATES
-- ============================================

INSERT INTO genui_templates (name, description, category, prompt, generated_ui, is_featured)
VALUES
  ('Sales Dashboard', 'KPI overview with revenue, users, and growth metrics', 'dashboard',
   'Create a dashboard with 4 KPIs and a trend chart',
   '{"title": "Sales Dashboard", "layout": "stack", "theme": "dark", "nodes": [{"id": "stats", "type": "StatGrid", "props": {"columns": 4, "stats": [{"value": "$52.4K", "label": "Revenue", "color": "green", "trend": "up", "trendValue": "+12.5%"}, {"value": "2,847", "label": "Users", "color": "blue", "trend": "up", "trendValue": "+8.2%"}, {"value": "1,234", "label": "Orders", "color": "orange", "trend": "up", "trendValue": "+23.1%"}, {"value": "94.2%", "label": "Growth", "color": "red", "trend": "down", "trendValue": "-2.4%"}]}}, {"id": "chart", "type": "MetricChart", "props": {"metricName": "Revenue", "chartType": "area", "timeRange": "7d", "color": "green"}}]}',
   true),

  ('Command Center', 'Interactive command palette for operations', 'operations',
   'Build a command palette with deployment, database, and monitoring commands',
   '{"title": "Command Center", "layout": "stack", "theme": "dark", "nodes": [{"id": "cmds", "type": "CommandPalette", "props": {"groups": [{"title": "Deployment", "icon": "rocket", "commands": [{"code": "/deploy", "description": "Deploy to production"}, {"code": "/rollback", "description": "Rollback last deploy"}]}, {"title": "Database", "icon": "database", "commands": [{"code": "/migrate", "description": "Run migrations"}, {"code": "/backup", "description": "Create backup"}]}, {"title": "Monitoring", "icon": "chart", "commands": [{"code": "/status", "description": "System status"}, {"code": "/logs", "description": "View logs"}]}]}}]}',
   true),

  ('Product Showcase', '3D carousel of product features', 'marketing',
   'Create a 3D carousel showcasing product features',
   '{"title": "Product Features", "layout": "stack", "theme": "dark", "nodes": [{"id": "carousel", "type": "Carousel3D", "props": {"autoRotate": true, "rotationSpeed": 5, "cards": [{"icon": "rocket", "title": "Fast Deploy", "body": "Deploy in seconds with CI/CD.", "statValue": "< 30s", "statLabel": "Deploy time", "color": "green"}, {"icon": "shield", "title": "Security", "body": "SOC 2 compliant.", "statValue": "99.99%", "statLabel": "Uptime", "color": "blue"}, {"icon": "chart", "title": "Analytics", "body": "Real-time metrics.", "statValue": "10ms", "statLabel": "Latency", "color": "orange"}]}}]}',
   true),

  ('Brand Colors', 'CentrexStyle color palette display', 'style',
   'Show the CentrexStyle brand color palette',
   '{"title": "Brand Colors", "layout": "stack", "theme": "dark", "nodes": [{"id": "colors", "type": "ColorPalette", "props": {"showValues": true, "showUsage": true, "interactive": true}}]}',
   false)

ON CONFLICT DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Increment view count for a panel
CREATE OR REPLACE FUNCTION genui_increment_view_count(panel_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE genui_panels
  SET view_count = view_count + 1
  WHERE slug = panel_slug AND is_published = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment template use count
CREATE OR REPLACE FUNCTION genui_increment_template_use(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE genui_templates
  SET use_count = use_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION genui_increment_view_count(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION genui_increment_template_use(UUID) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Generative UI migration completed successfully';
  RAISE NOTICE 'Tables created: genui_panels, genui_catalog, genui_generations, genui_templates, genui_data_bindings';
  RAISE NOTICE 'Seeded % catalog components and % templates',
    (SELECT count(*) FROM genui_catalog),
    (SELECT count(*) FROM genui_templates);
END $$;
