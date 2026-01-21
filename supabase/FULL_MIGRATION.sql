-- ============================================
-- FULL MIGRATION - Run in Supabase SQL Editor
-- This combines all feature migrations
-- ============================================

-- ============================================
-- PART 1: CORE FUNCTIONS
-- ============================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN true; -- For now, all authenticated users are admins
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 2: TENANTS (simplified, no ltree)
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT UNIQUE,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

INSERT INTO tenants (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Default', 'default')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage tenants" ON tenants;
DROP POLICY IF EXISTS "Admins can manage tenant_users" ON tenant_users;
CREATE POLICY "Admins can manage tenants" ON tenants FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage tenant_users" ON tenant_users FOR ALL USING (is_admin());

-- ============================================
-- PART 3: BOOKMARKS
-- ============================================

CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  favicon_url TEXT,
  screenshot_url TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  click_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_tenant ON bookmarks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);
CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks USING GIN(tags);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Public can view public bookmarks" ON bookmarks;
CREATE POLICY "Admins can manage bookmarks" ON bookmarks FOR ALL USING (is_admin());
CREATE POLICY "Public can view public bookmarks" ON bookmarks FOR SELECT USING (is_public = true);

-- ============================================
-- PART 4: CRM / CONTACTS
-- ============================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  website TEXT,
  linkedin_url TEXT,
  twitter_handle TEXT,
  github_username TEXT,
  contact_type TEXT DEFAULT 'lead' CHECK (contact_type IN ('lead', 'prospect', 'client', 'partner', 'vendor', 'personal', 'other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  lead_score INTEGER DEFAULT 0,
  source TEXT,
  source_detail TEXT,
  referrer_id UUID REFERENCES contacts(id),
  city TEXT,
  state TEXT,
  country TEXT,
  timezone TEXT,
  avatar_url TEXT,
  bio TEXT,
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
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'email_sent', 'email_received', 'call_outbound', 'call_inbound',
    'meeting', 'video_call', 'message', 'linkedin_message',
    'note', 'task_completed', 'website_visit', 'form_submission', 'other'
  )),
  subject TEXT,
  content TEXT,
  duration_minutes INTEGER,
  outcome TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  related_url TEXT,
  attachments JSONB DEFAULT '[]',
  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  follow_up_type TEXT DEFAULT 'reminder' CHECK (follow_up_type IN ('reminder', 'call', 'email', 'meeting', 'task', 'review')),
  due_at TIMESTAMPTZ NOT NULL,
  remind_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'snoozed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  completion_notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  parent_follow_up_id UUID REFERENCES follow_ups(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  list_type TEXT DEFAULT 'static' CHECK (list_type IN ('static', 'smart')),
  smart_filter JSONB,
  color TEXT DEFAULT 'blue',
  icon TEXT,
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_list_members (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  list_id UUID REFERENCES contact_lists(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by TEXT,
  PRIMARY KEY (contact_id, list_id)
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
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT DEFAULT 'gray',
  sort_order INTEGER DEFAULT 0,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  probability INTEGER DEFAULT 0,
  UNIQUE(pipeline_id, slug)
);

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  value DECIMAL(12, 2),
  currency TEXT DEFAULT 'USD',
  pipeline_id UUID NOT NULL REFERENCES pipelines(id),
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  close_date TIMESTAMPTZ,
  lost_reason TEXT,
  probability INTEGER,
  expected_revenue DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can do everything with interactions" ON interactions;
DROP POLICY IF EXISTS "Admins can do everything with follow_ups" ON follow_ups;
DROP POLICY IF EXISTS "Admins can do everything with contact_lists" ON contact_lists;
DROP POLICY IF EXISTS "Admins can do everything with contact_list_members" ON contact_list_members;
DROP POLICY IF EXISTS "Admins can do everything with pipelines" ON pipelines;
DROP POLICY IF EXISTS "Admins can do everything with pipeline_stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Admins can do everything with deals" ON deals;

CREATE POLICY "Admins can do everything with contacts" ON contacts FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with interactions" ON interactions FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with follow_ups" ON follow_ups FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with contact_lists" ON contact_lists FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with contact_list_members" ON contact_list_members FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with pipelines" ON pipelines FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with pipeline_stages" ON pipeline_stages FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with deals" ON deals FOR ALL USING (is_admin());

-- Default pipeline
INSERT INTO pipelines (name, slug, description, is_default) VALUES
  ('Sales Pipeline', 'sales', 'Default sales pipeline', true)
ON CONFLICT (slug) DO NOTHING;

-- Default contact lists
INSERT INTO contact_lists (name, slug, description, color) VALUES
  ('Hot Leads', 'hot-leads', 'High priority leads', 'red'),
  ('Newsletter', 'newsletter', 'Newsletter subscribers', 'blue'),
  ('Clients', 'clients', 'Active clients', 'green')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PART 5: NEWS
-- ============================================

CREATE TABLE IF NOT EXISTS news_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
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
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'api')),
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
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  source_id UUID NOT NULL REFERENCES news_sources(id) ON DELETE CASCADE,
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  url TEXT NOT NULL,
  source_url TEXT,
  image_url TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  is_bookmarked BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  admin_notes TEXT,
  is_curated BOOLEAN DEFAULT false,
  curated_at TIMESTAMPTZ,
  curated_summary TEXT,
  curated_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, external_id)
);

ALTER TABLE news_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with news_categories" ON news_categories;
DROP POLICY IF EXISTS "Admins can do everything with news_sources" ON news_sources;
DROP POLICY IF EXISTS "Admins can do everything with news_articles" ON news_articles;

CREATE POLICY "Admins can do everything with news_categories" ON news_categories FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with news_sources" ON news_sources FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with news_articles" ON news_articles FOR ALL USING (is_admin());

INSERT INTO news_categories (tenant_id, slug, name, description, color, order_index) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ai-research', 'AI Research', 'Academic papers and research', 'blue', 0),
  ('00000000-0000-0000-0000-000000000001', 'industry', 'Industry News', 'Business developments', 'green', 1),
  ('00000000-0000-0000-0000-000000000001', 'tools', 'Tools & Libraries', 'New tools and frameworks', 'purple', 2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PART 6: TASKS
-- ============================================

CREATE TABLE IF NOT EXISTS task_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
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
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  project_id UUID REFERENCES task_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
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

DROP POLICY IF EXISTS "Admins can do everything with task_projects" ON task_projects;
DROP POLICY IF EXISTS "Admins can do everything with tasks" ON tasks;

CREATE POLICY "Admins can do everything with task_projects" ON task_projects FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with tasks" ON tasks FOR ALL USING (is_admin());

INSERT INTO task_projects (tenant_id, name, slug, description, color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Personal', 'personal', 'Personal tasks', 'blue'),
  ('00000000-0000-0000-0000-000000000001', 'Work', 'work', 'Work tasks', 'green')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PART 7: METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS metric_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'api', 'webhook', 'database')),
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  source_id UUID REFERENCES metric_sources(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT DEFAULT 'gauge' CHECK (metric_type IN ('gauge', 'counter', 'histogram')),
  value NUMERIC NOT NULL,
  unit TEXT,
  dimensions JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded ON metrics(recorded_at DESC);

ALTER TABLE metric_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with metric_sources" ON metric_sources;
DROP POLICY IF EXISTS "Admins can do everything with metrics" ON metrics;

CREATE POLICY "Admins can do everything with metric_sources" ON metric_sources FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with metrics" ON metrics FOR ALL USING (is_admin());

-- ============================================
-- PART 8: MARKETING & NPS
-- ============================================

CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained')),
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
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  question TEXT NOT NULL DEFAULT 'How likely are you to recommend us to a friend or colleague?',
  target_segment TEXT,
  segment_rules JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
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
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
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
  referrer TEXT,
  responded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nps_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  survey_id UUID REFERENCES nps_surveys(id) ON DELETE CASCADE,
  response_id UUID REFERENCES nps_responses(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('sentiment', 'detractor_risk', 'trend', 'summary')),
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

DROP POLICY IF EXISTS "Admins can do everything with email_subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Admins can do everything with nps_surveys" ON nps_surveys;
DROP POLICY IF EXISTS "Admins can view nps_responses" ON nps_responses;
DROP POLICY IF EXISTS "Admins can do everything with nps_analysis" ON nps_analysis;

CREATE POLICY "Admins can do everything with email_subscribers" ON email_subscribers FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with nps_surveys" ON nps_surveys FOR ALL USING (is_admin());
CREATE POLICY "Admins can view nps_responses" ON nps_responses FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with nps_analysis" ON nps_analysis FOR ALL USING (is_admin());

-- ============================================
-- PART 9: STYLE GUIDE
-- ============================================

CREATE TABLE IF NOT EXISTS style_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  design_tokens JSONB DEFAULT '{}',
  figma_file_key TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS style_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES style_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex_value TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, name)
);

CREATE TABLE IF NOT EXISTS style_typography (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES style_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  font_family TEXT NOT NULL,
  font_size NUMERIC(6,2) NOT NULL,
  font_weight INTEGER NOT NULL,
  line_height NUMERIC(4,2) NOT NULL,
  letter_spacing NUMERIC(4,2) DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, name)
);

ALTER TABLE style_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_typography ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "style_brands_admin_all" ON style_brands;
DROP POLICY IF EXISTS "style_colors_admin_all" ON style_colors;
DROP POLICY IF EXISTS "style_typography_admin_all" ON style_typography;

CREATE POLICY "style_brands_admin_all" ON style_brands FOR ALL USING (is_admin());
CREATE POLICY "style_colors_admin_all" ON style_colors FOR ALL USING (is_admin());
CREATE POLICY "style_typography_admin_all" ON style_typography FOR ALL USING (is_admin());

INSERT INTO style_brands (tenant_id, name, description, primary_color, secondary_color, is_default, design_tokens)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'CentrexStyle',
  'Official CentrexIT brand design system',
  '#3dae2b',
  '#0071ce',
  true,
  '{"colors": [{"name": "Primary Green", "value": "#3dae2b"}]}'::jsonb
)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================
-- PART 10: GENERATIVE UI
-- ============================================

CREATE TABLE IF NOT EXISTS genui_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
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

CREATE INDEX IF NOT EXISTS idx_genui_panels_slug ON genui_panels(slug);
CREATE INDEX IF NOT EXISTS idx_genui_panels_published ON genui_panels(is_published) WHERE is_published = true;

ALTER TABLE genui_panels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "genui_panels_admin_all" ON genui_panels;
DROP POLICY IF EXISTS "genui_panels_public_read" ON genui_panels;

CREATE POLICY "genui_panels_admin_all" ON genui_panels FOR ALL USING (is_admin());
CREATE POLICY "genui_panels_public_read" ON genui_panels FOR SELECT USING (is_published = true);

-- ============================================
-- DONE!
-- ============================================

SELECT 'All migrations completed successfully!' AS status;
