-- ============================================
-- FULL MIGRATION v3 - Fixed ON CONFLICT issues
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: CORE FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 2: TENANTS
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO tenants (id, name, slug)
SELECT '00000000-0000-0000-0000-000000000001', 'Default', 'default'
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001');

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_admin" ON tenants;
CREATE POLICY "tenants_admin" ON tenants FOR ALL USING (is_admin());

-- ============================================
-- PART 3: BOOKMARKS
-- ============================================

CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  favicon_url TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookmarks_admin" ON bookmarks;
DROP POLICY IF EXISTS "bookmarks_public" ON bookmarks;
CREATE POLICY "bookmarks_admin" ON bookmarks FOR ALL USING (is_admin());
CREATE POLICY "bookmarks_public" ON bookmarks FOR SELECT USING (is_public = true);

-- ============================================
-- PART 4: CRM CONTACTS
-- ============================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  website TEXT,
  linkedin_url TEXT,
  contact_type TEXT DEFAULT 'lead',
  status TEXT DEFAULT 'active',
  lead_score INTEGER DEFAULT 0,
  source TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  avatar_url TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  duration_minutes INTEGER,
  outcome TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  follow_up_type TEXT DEFAULT 'reminder',
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  list_type TEXT DEFAULT 'static',
  color TEXT DEFAULT 'blue',
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT DEFAULT 'gray',
  sort_order INTEGER DEFAULT 0,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  probability INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  value DECIMAL(12, 2),
  currency TEXT DEFAULT 'USD',
  pipeline_id UUID REFERENCES pipelines(id),
  stage_id UUID REFERENCES pipeline_stages(id),
  status TEXT DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_admin" ON contacts;
DROP POLICY IF EXISTS "interactions_admin" ON interactions;
DROP POLICY IF EXISTS "follow_ups_admin" ON follow_ups;
DROP POLICY IF EXISTS "contact_lists_admin" ON contact_lists;
DROP POLICY IF EXISTS "pipelines_admin" ON pipelines;
DROP POLICY IF EXISTS "pipeline_stages_admin" ON pipeline_stages;
DROP POLICY IF EXISTS "deals_admin" ON deals;

CREATE POLICY "contacts_admin" ON contacts FOR ALL USING (is_admin());
CREATE POLICY "interactions_admin" ON interactions FOR ALL USING (is_admin());
CREATE POLICY "follow_ups_admin" ON follow_ups FOR ALL USING (is_admin());
CREATE POLICY "contact_lists_admin" ON contact_lists FOR ALL USING (is_admin());
CREATE POLICY "pipelines_admin" ON pipelines FOR ALL USING (is_admin());
CREATE POLICY "pipeline_stages_admin" ON pipeline_stages FOR ALL USING (is_admin());
CREATE POLICY "deals_admin" ON deals FOR ALL USING (is_admin());

-- Seed pipelines
INSERT INTO pipelines (name, slug, description, is_default)
SELECT 'Sales Pipeline', 'sales', 'Default sales pipeline', true
WHERE NOT EXISTS (SELECT 1 FROM pipelines WHERE slug = 'sales');

-- Seed contact lists
INSERT INTO contact_lists (name, slug, description, color)
SELECT 'Hot Leads', 'hot-leads', 'High priority leads', 'red'
WHERE NOT EXISTS (SELECT 1 FROM contact_lists WHERE slug = 'hot-leads');

INSERT INTO contact_lists (name, slug, description, color)
SELECT 'Newsletter', 'newsletter', 'Newsletter subscribers', 'blue'
WHERE NOT EXISTS (SELECT 1 FROM contact_lists WHERE slug = 'newsletter');

INSERT INTO contact_lists (name, slug, description, color)
SELECT 'Clients', 'clients', 'Active clients', 'green'
WHERE NOT EXISTS (SELECT 1 FROM contact_lists WHERE slug = 'clients');

-- ============================================
-- PART 5: NEWS
-- ============================================

CREATE TABLE IF NOT EXISTS news_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'rss',
  url TEXT NOT NULL,
  api_key TEXT,
  category_slug TEXT REFERENCES news_categories(slug) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  refresh_interval_minutes INTEGER DEFAULT 60,
  last_fetched_at TIMESTAMPTZ,
  fetch_error TEXT,
  icon_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES news_sources(id) ON DELETE CASCADE,
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  url TEXT NOT NULL,
  image_url TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  is_bookmarked BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_curated BOOLEAN DEFAULT false,
  curated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE news_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_categories_admin" ON news_categories;
DROP POLICY IF EXISTS "news_sources_admin" ON news_sources;
DROP POLICY IF EXISTS "news_articles_admin" ON news_articles;

CREATE POLICY "news_categories_admin" ON news_categories FOR ALL USING (is_admin());
CREATE POLICY "news_sources_admin" ON news_sources FOR ALL USING (is_admin());
CREATE POLICY "news_articles_admin" ON news_articles FOR ALL USING (is_admin());

-- Seed news categories
INSERT INTO news_categories (slug, name, description, color, order_index)
SELECT 'ai-research', 'AI Research', 'Academic papers and research', 'blue', 0
WHERE NOT EXISTS (SELECT 1 FROM news_categories WHERE slug = 'ai-research');

INSERT INTO news_categories (slug, name, description, color, order_index)
SELECT 'industry', 'Industry News', 'Business developments', 'green', 1
WHERE NOT EXISTS (SELECT 1 FROM news_categories WHERE slug = 'industry');

INSERT INTO news_categories (slug, name, description, color, order_index)
SELECT 'tools', 'Tools & Libraries', 'New tools and frameworks', 'purple', 2
WHERE NOT EXISTS (SELECT 1 FROM news_categories WHERE slug = 'tools');

-- ============================================
-- PART 6: TASKS
-- ============================================

CREATE TABLE IF NOT EXISTS task_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES task_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  assignee_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_projects_admin" ON task_projects;
DROP POLICY IF EXISTS "tasks_admin" ON tasks;

CREATE POLICY "task_projects_admin" ON task_projects FOR ALL USING (is_admin());
CREATE POLICY "tasks_admin" ON tasks FOR ALL USING (is_admin());

-- Seed task projects
INSERT INTO task_projects (name, slug, description, color)
SELECT 'Personal', 'personal', 'Personal tasks', 'blue'
WHERE NOT EXISTS (SELECT 1 FROM task_projects WHERE slug = 'personal');

INSERT INTO task_projects (name, slug, description, color)
SELECT 'Work', 'work', 'Work tasks', 'green'
WHERE NOT EXISTS (SELECT 1 FROM task_projects WHERE slug = 'work');

-- ============================================
-- PART 7: METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS metric_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES metric_sources(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT DEFAULT 'gauge',
  value NUMERIC NOT NULL,
  unit TEXT,
  dimensions JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE metric_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metric_sources_admin" ON metric_sources;
DROP POLICY IF EXISTS "metrics_admin" ON metrics;

CREATE POLICY "metric_sources_admin" ON metric_sources FOR ALL USING (is_admin());
CREATE POLICY "metrics_admin" ON metrics FOR ALL USING (is_admin());

-- ============================================
-- PART 8: MARKETING & NPS
-- ============================================

CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'active',
  lists TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nps_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  question TEXT NOT NULL DEFAULT 'How likely are you to recommend us to a friend or colleague?',
  target_segment TEXT,
  segment_rules JSONB,
  status TEXT DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  responses_count INTEGER DEFAULT 0,
  promoters_count INTEGER DEFAULT 0,
  passives_count INTEGER DEFAULT 0,
  detractors_count INTEGER DEFAULT 0,
  nps_score NUMERIC,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES nps_surveys(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  email TEXT,
  name TEXT,
  subscriber_id UUID REFERENCES email_subscribers(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  category TEXT GENERATED ALWAYS AS (
    CASE
      WHEN score >= 9 THEN 'promoter'
      WHEN score >= 7 THEN 'passive'
      ELSE 'detractor'
    END
  ) STORED,
  ip_address TEXT,
  user_agent TEXT,
  responded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nps_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES nps_surveys(id) ON DELETE CASCADE,
  response_id UUID REFERENCES nps_responses(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  result JSONB NOT NULL,
  model_used TEXT DEFAULT 'claude-3-5-sonnet',
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_subscribers_admin" ON email_subscribers;
DROP POLICY IF EXISTS "nps_surveys_admin" ON nps_surveys;
DROP POLICY IF EXISTS "nps_responses_admin" ON nps_responses;
DROP POLICY IF EXISTS "nps_analysis_admin" ON nps_analysis;

CREATE POLICY "email_subscribers_admin" ON email_subscribers FOR ALL USING (is_admin());
CREATE POLICY "nps_surveys_admin" ON nps_surveys FOR ALL USING (is_admin());
CREATE POLICY "nps_responses_admin" ON nps_responses FOR ALL USING (is_admin());
CREATE POLICY "nps_analysis_admin" ON nps_analysis FOR ALL USING (is_admin());

-- ============================================
-- PART 9: STYLE GUIDE
-- ============================================

CREATE TABLE IF NOT EXISTS style_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  design_tokens JSONB DEFAULT '{}',
  figma_file_key TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS style_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES style_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex_value TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS style_typography (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES style_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  font_family TEXT NOT NULL,
  font_size NUMERIC(6,2) NOT NULL,
  font_weight INTEGER NOT NULL,
  line_height NUMERIC(4,2) NOT NULL,
  letter_spacing NUMERIC(4,2) DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE style_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_typography ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "style_brands_admin" ON style_brands;
DROP POLICY IF EXISTS "style_colors_admin" ON style_colors;
DROP POLICY IF EXISTS "style_typography_admin" ON style_typography;

CREATE POLICY "style_brands_admin" ON style_brands FOR ALL USING (is_admin());
CREATE POLICY "style_colors_admin" ON style_colors FOR ALL USING (is_admin());
CREATE POLICY "style_typography_admin" ON style_typography FOR ALL USING (is_admin());

-- Seed style brand
INSERT INTO style_brands (name, description, primary_color, secondary_color, is_default, design_tokens)
SELECT 'CentrexStyle', 'Official CentrexIT brand design system', '#3dae2b', '#0071ce', true, '{"colors": []}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM style_brands WHERE name = 'CentrexStyle');

-- ============================================
-- PART 10: GENERATIVE UI
-- ============================================

CREATE TABLE IF NOT EXISTS genui_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  prompt TEXT,
  generated_ui JSONB NOT NULL,
  is_published BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE genui_panels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "genui_panels_admin" ON genui_panels;
DROP POLICY IF EXISTS "genui_panels_public" ON genui_panels;

CREATE POLICY "genui_panels_admin" ON genui_panels FOR ALL USING (is_admin());
CREATE POLICY "genui_panels_public" ON genui_panels FOR SELECT USING (is_published = true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded ON metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_nps_responses_survey ON nps_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_genui_panels_slug ON genui_panels(slug);

-- ============================================
-- DONE!
-- ============================================

SELECT 'All migrations completed successfully!' AS status;
