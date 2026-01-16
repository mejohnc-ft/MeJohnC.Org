-- News Feed Database Schema
-- Run this in Supabase SQL Editor after schema.sql

-- ============================================
-- NEWS CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS news_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue', -- Badge color: blue, green, purple, orange, red, yellow
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NEWS SOURCES (RSS feeds and API endpoints)
-- ============================================
CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'api')),
  url TEXT NOT NULL,
  api_key TEXT, -- Encrypted at rest by Supabase (nullable for RSS)
  category_slug TEXT REFERENCES news_categories(slug) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  refresh_interval_minutes INTEGER DEFAULT 60,
  last_fetched_at TIMESTAMPTZ,
  fetch_error TEXT, -- Last error message if any
  icon_url TEXT, -- Source favicon/logo
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NEWS ARTICLES
-- ============================================
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES news_sources(id) ON DELETE CASCADE,
  external_id TEXT, -- Unique ID from source (guid, url hash) for deduplication
  title TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Full content if available
  url TEXT NOT NULL,
  image_url TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT now(),

  -- Admin state
  is_read BOOLEAN DEFAULT false,
  is_bookmarked BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  admin_notes TEXT,

  -- Public curation
  is_curated BOOLEAN DEFAULT false, -- Selected for public display
  curated_at TIMESTAMPTZ,
  curated_summary TEXT, -- Optional admin summary for public
  curated_order INTEGER, -- Order on public page

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(source_id, external_id)
);

-- ============================================
-- NEWS FILTERS (global keyword filters)
-- ============================================
CREATE TABLE IF NOT EXISTS news_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_type TEXT NOT NULL CHECK (filter_type IN ('include_keyword', 'exclude_keyword', 'include_topic', 'exclude_source')),
  value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NEWS DASHBOARD TABS (configurable tabs)
-- ============================================
CREATE TABLE IF NOT EXISTS news_dashboard_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  tab_type TEXT NOT NULL CHECK (tab_type IN ('filter', 'category', 'source', 'saved_search', 'custom')),
  config JSONB DEFAULT '{}', -- Filter configuration
  icon TEXT, -- Lucide icon name (optional)
  is_active BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false, -- Cannot be removed (for system tabs)
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_news_categories_slug ON news_categories(slug);
CREATE INDEX IF NOT EXISTS idx_news_categories_order ON news_categories(order_index);

CREATE INDEX IF NOT EXISTS idx_news_sources_category ON news_sources(category_slug);
CREATE INDEX IF NOT EXISTS idx_news_sources_active ON news_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_news_sources_order ON news_sources(order_index);

CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_fetched ON news_articles(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_curated ON news_articles(is_curated, curated_order) WHERE is_curated = true;
CREATE INDEX IF NOT EXISTS idx_news_articles_bookmarked ON news_articles(is_bookmarked) WHERE is_bookmarked = true;
CREATE INDEX IF NOT EXISTS idx_news_articles_unread ON news_articles(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_news_articles_external_id ON news_articles(source_id, external_id);

CREATE INDEX IF NOT EXISTS idx_news_filters_type ON news_filters(filter_type);
CREATE INDEX IF NOT EXISTS idx_news_filters_active ON news_filters(is_active);

CREATE INDEX IF NOT EXISTS idx_news_dashboard_tabs_order ON news_dashboard_tabs(order_index);
CREATE INDEX IF NOT EXISTS idx_news_dashboard_tabs_active ON news_dashboard_tabs(is_active);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE news_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_dashboard_tabs ENABLE ROW LEVEL SECURITY;

-- Public read for categories (needed for public /ai-news page)
CREATE POLICY "Public can view news categories" ON news_categories
  FOR SELECT USING (true);

-- Public read for active sources
CREATE POLICY "Public can view active news sources" ON news_sources
  FOR SELECT USING (is_active = true);

-- Public read for curated articles only
CREATE POLICY "Public can view curated articles" ON news_articles
  FOR SELECT USING (is_curated = true AND is_archived = false);

-- Filters are admin-only (no public policy)

-- Dashboard tabs are admin-only (no public policy)

-- Admin full access policies
CREATE POLICY "Admins can do everything with news_categories" ON news_categories
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with news_sources" ON news_sources
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with news_articles" ON news_articles
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with news_filters" ON news_filters
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with news_dashboard_tabs" ON news_dashboard_tabs
  FOR ALL USING (is_admin());

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE TRIGGER update_news_categories_updated_at
  BEFORE UPDATE ON news_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_sources_updated_at
  BEFORE UPDATE ON news_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_articles_updated_at
  BEFORE UPDATE ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_filters_updated_at
  BEFORE UPDATE ON news_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_dashboard_tabs_updated_at
  BEFORE UPDATE ON news_dashboard_tabs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Default Categories
-- ============================================
INSERT INTO news_categories (slug, name, description, color, order_index) VALUES
  ('ai-research', 'AI Research', 'Academic papers and research announcements', 'blue', 0),
  ('industry', 'Industry News', 'Business and industry developments', 'green', 1),
  ('tools', 'Tools & Libraries', 'New tools, frameworks, and libraries', 'purple', 2),
  ('tutorials', 'Tutorials', 'Learning resources and how-tos', 'orange', 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED DATA: Default Dashboard Tabs
-- ============================================
INSERT INTO news_dashboard_tabs (slug, label, tab_type, config, is_pinned, order_index) VALUES
  ('all', 'All', 'filter', '{"filter": "all"}', true, 0),
  ('unread', 'Unread', 'filter', '{"filter": "unread"}', true, 1),
  ('bookmarked', 'Bookmarked', 'filter', '{"filter": "bookmarked"}', false, 2),
  ('curated', 'Curated', 'filter', '{"filter": "curated"}', false, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED DATA: Example RSS Sources (commented out - uncomment to seed)
-- ============================================
-- INSERT INTO news_sources (name, source_type, url, category_slug, order_index) VALUES
--   ('Anthropic Blog', 'rss', 'https://www.anthropic.com/feed.xml', 'ai-research', 0),
--   ('OpenAI Blog', 'rss', 'https://openai.com/blog/rss/', 'ai-research', 1),
--   ('HuggingFace Blog', 'rss', 'https://huggingface.co/blog/feed.xml', 'tools', 2),
--   ('ArXiv AI', 'rss', 'https://export.arxiv.org/rss/cs.AI', 'ai-research', 3),
--   ('MIT Tech Review', 'rss', 'https://www.technologyreview.com/feed/', 'industry', 4)
-- ON CONFLICT DO NOTHING;
