-- Migration: Metrics Dashboard Infrastructure
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql must be applied first (provides is_admin() and update_updated_at_column())
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
-- METRICS SOURCES
-- ============================================
-- Stores configuration for external data sources (GitHub, Analytics, etc.)
CREATE TABLE IF NOT EXISTS metrics_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('github', 'analytics', 'supabase', 'webhook', 'custom')),
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT 'blue',

  -- Connection config
  endpoint_url TEXT,
  auth_type TEXT CHECK (auth_type IN ('none', 'api_key', 'oauth', 'bearer')),
  auth_config JSONB DEFAULT '{}', -- Stores tokens/keys (encrypted at rest by Supabase)
  headers JSONB DEFAULT '{}',

  -- Refresh settings
  refresh_interval_minutes INTEGER DEFAULT 60,
  last_refresh_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- METRICS DATA
-- ============================================
-- Time series data points from all sources
CREATE TABLE IF NOT EXISTS metrics_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES metrics_sources(id) ON DELETE CASCADE,

  -- Metric identification
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')),

  -- The actual data point
  value NUMERIC NOT NULL,
  unit TEXT, -- e.g., 'count', 'bytes', 'ms', 'percent'

  -- Dimensions for filtering/grouping
  dimensions JSONB DEFAULT '{}', -- e.g., {"repo": "MeJohnC.Org", "branch": "main"}

  -- Timestamp of the metric (not when it was stored)
  recorded_at TIMESTAMPTZ NOT NULL,

  -- When we stored it
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- METRICS DASHBOARDS
-- ============================================
-- Saved dashboard configurations
CREATE TABLE IF NOT EXISTS metrics_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Dashboard layout and widgets
  layout JSONB DEFAULT '[]', -- Array of widget configs
  -- Each widget: { id, type, title, source_id, metric_name, chart_type, options, position: {x, y, w, h} }

  -- Display options
  default_time_range TEXT DEFAULT '7d', -- 1h, 24h, 7d, 30d, 90d, 1y, custom
  refresh_interval_seconds INTEGER DEFAULT 300,

  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,

  created_by TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- METRICS ALERTS (optional, for future)
-- ============================================
CREATE TABLE IF NOT EXISTS metrics_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES metrics_sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metric_name TEXT NOT NULL,

  -- Alert conditions
  condition_type TEXT NOT NULL CHECK (condition_type IN ('above', 'below', 'equals', 'change_percent')),
  threshold NUMERIC NOT NULL,
  evaluation_window_minutes INTEGER DEFAULT 5,

  -- Notification settings
  notify_channels TEXT[] DEFAULT '{}', -- e.g., ['email', 'slack']
  notify_config JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_metrics_sources_slug ON metrics_sources(slug);
CREATE INDEX IF NOT EXISTS idx_metrics_sources_type ON metrics_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_metrics_sources_active ON metrics_sources(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_metrics_sources_next_refresh ON metrics_sources(next_refresh_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_metrics_data_source ON metrics_data(source_id);
CREATE INDEX IF NOT EXISTS idx_metrics_data_name ON metrics_data(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_data_recorded ON metrics_data(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_data_source_name ON metrics_data(source_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_data_source_recorded ON metrics_data(source_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_data_dimensions ON metrics_data USING GIN(dimensions);

CREATE INDEX IF NOT EXISTS idx_metrics_dashboards_slug ON metrics_dashboards(slug);
CREATE INDEX IF NOT EXISTS idx_metrics_dashboards_default ON metrics_dashboards(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_metrics_dashboards_public ON metrics_dashboards(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_metrics_alerts_source ON metrics_alerts(source_id);
CREATE INDEX IF NOT EXISTS idx_metrics_alerts_active ON metrics_alerts(is_active) WHERE is_active = true;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE metrics_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (for idempotency)
DROP POLICY IF EXISTS "Admins can do everything with metrics_sources" ON metrics_sources;
DROP POLICY IF EXISTS "Admins can do everything with metrics_data" ON metrics_data;
DROP POLICY IF EXISTS "Admins can do everything with metrics_dashboards" ON metrics_dashboards;
DROP POLICY IF EXISTS "Public can view public dashboards" ON metrics_dashboards;
DROP POLICY IF EXISTS "Admins can do everything with metrics_alerts" ON metrics_alerts;

-- Create policies
CREATE POLICY "Admins can do everything with metrics_sources" ON metrics_sources FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with metrics_data" ON metrics_data FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with metrics_dashboards" ON metrics_dashboards FOR ALL USING (is_admin());
CREATE POLICY "Public can view public dashboards" ON metrics_dashboards FOR SELECT USING (is_public = true);
CREATE POLICY "Admins can do everything with metrics_alerts" ON metrics_alerts FOR ALL USING (is_admin());

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_metrics_sources_updated_at ON metrics_sources;
CREATE TRIGGER update_metrics_sources_updated_at
  BEFORE UPDATE ON metrics_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_metrics_dashboards_updated_at ON metrics_dashboards;
CREATE TRIGGER update_metrics_dashboards_updated_at
  BEFORE UPDATE ON metrics_dashboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_metrics_alerts_updated_at ON metrics_alerts;
CREATE TRIGGER update_metrics_alerts_updated_at
  BEFORE UPDATE ON metrics_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get aggregated metrics for a time range
CREATE OR REPLACE FUNCTION get_metrics_aggregated(
  p_source_id UUID,
  p_metric_name TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_interval TEXT DEFAULT '1 hour'
)
RETURNS TABLE (
  time_bucket TIMESTAMPTZ,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  sum_value NUMERIC,
  count BIGINT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    date_trunc(p_interval, recorded_at) as time_bucket,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    SUM(value) as sum_value,
    COUNT(*) as count
  FROM metrics_data
  WHERE source_id = p_source_id
    AND metric_name = p_metric_name
    AND recorded_at >= p_start_time
    AND recorded_at < p_end_time
  GROUP BY time_bucket
  ORDER BY time_bucket;
$$;

-- Clean up old metrics data (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_metrics(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM metrics_data
  WHERE recorded_at < now() - (retention_days || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- SEED DEFAULT DATA
-- ============================================
INSERT INTO metrics_dashboards (name, slug, description, is_default, layout)
VALUES (
  'Overview',
  'overview',
  'Main metrics dashboard with key performance indicators',
  true,
  '[]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
