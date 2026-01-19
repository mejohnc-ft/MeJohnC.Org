-- =====================================================================
-- PHASE 3 COMBINED MIGRATION
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql must be applied first
-- =====================================================================

-- ============================================
-- PART 1: MARKETING MODULE
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE EXCEPTION 'Missing prerequisite: is_admin() function. Run schema.sql first.';
  END IF;
END $$;

-- EMAIL SUBSCRIBERS
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained')),
  lists TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  last_email_sent_at TIMESTAMPTZ,
  last_email_opened_at TIMESTAMPTZ,
  last_email_clicked_at TIMESTAMPTZ,
  total_emails_sent INTEGER DEFAULT 0,
  total_emails_opened INTEGER DEFAULT 0,
  total_emails_clicked INTEGER DEFAULT 0,
  source TEXT,
  source_detail TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- EMAIL LISTS
CREATE TABLE IF NOT EXISTS email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  double_opt_in BOOLEAN DEFAULT true,
  subscriber_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- EMAIL CAMPAIGNS
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  template_id UUID,
  html_content TEXT,
  text_content TEXT,
  list_ids UUID[],
  segment_rules JSONB,
  exclude_tags TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  complained_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  is_ab_test BOOLEAN DEFAULT false,
  ab_test_config JSONB,
  created_by TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  template_type TEXT DEFAULT 'custom' CHECK (template_type IN ('newsletter', 'transactional', 'promotional', 'custom')),
  subject_template TEXT,
  preview_text_template TEXT,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '{}',
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- EMAIL EVENTS
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
  subscriber_id UUID REFERENCES email_subscribers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  link_url TEXT,
  bounce_type TEXT,
  bounce_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  provider_message_id TEXT,
  provider_event_id TEXT,
  provider_metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- NPS SURVEYS
CREATE TABLE IF NOT EXISTS nps_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- NPS RESPONSES
CREATE TABLE IF NOT EXISTS nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES nps_surveys(id) ON DELETE CASCADE,
  email TEXT,
  subscriber_id UUID REFERENCES email_subscribers(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  category TEXT GENERATED ALWAYS AS (
    CASE WHEN score >= 9 THEN 'promoter' WHEN score >= 7 THEN 'passive' ELSE 'detractor' END
  ) STORED,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  responded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CONTENT SUGGESTIONS
CREATE TABLE IF NOT EXISTS content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('email_subject', 'email_body', 'social_post', 'blog_title', 'landing_page_copy')),
  prompt TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  suggestions JSONB NOT NULL,
  model TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'used')),
  selected_suggestion INTEGER,
  used_in_campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Marketing indexes
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON email_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_lists ON email_subscribers USING GIN(lists);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_nps_surveys_status ON nps_surveys(status);
CREATE INDEX IF NOT EXISTS idx_nps_responses_survey ON nps_responses(survey_id);

-- Marketing RLS
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with email_subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Admins can do everything with email_lists" ON email_lists;
DROP POLICY IF EXISTS "Admins can do everything with email_campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Admins can do everything with email_templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can view email_events" ON email_events;
DROP POLICY IF EXISTS "Admins can do everything with nps_surveys" ON nps_surveys;
DROP POLICY IF EXISTS "Public can respond to active surveys" ON nps_responses;
DROP POLICY IF EXISTS "Admins can view nps_responses" ON nps_responses;
DROP POLICY IF EXISTS "Admins can do everything with content_suggestions" ON content_suggestions;

CREATE POLICY "Admins can do everything with email_subscribers" ON email_subscribers FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with email_lists" ON email_lists FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with email_campaigns" ON email_campaigns FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with email_templates" ON email_templates FOR ALL USING (is_admin());
CREATE POLICY "Admins can view email_events" ON email_events FOR SELECT USING (is_admin());
CREATE POLICY "Admins can do everything with nps_surveys" ON nps_surveys FOR ALL USING (is_admin());
CREATE POLICY "Public can respond to active surveys" ON nps_responses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM nps_surveys WHERE nps_surveys.id = nps_responses.survey_id AND nps_surveys.status = 'active'));
CREATE POLICY "Admins can view nps_responses" ON nps_responses FOR SELECT USING (is_admin());
CREATE POLICY "Admins can do everything with content_suggestions" ON content_suggestions FOR ALL USING (is_admin());

-- Marketing triggers
DROP TRIGGER IF EXISTS update_email_subscribers_updated_at ON email_subscribers;
CREATE TRIGGER update_email_subscribers_updated_at BEFORE UPDATE ON email_subscribers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_lists_updated_at ON email_lists;
CREATE TRIGGER update_email_lists_updated_at BEFORE UPDATE ON email_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nps_surveys_updated_at ON nps_surveys;
CREATE TRIGGER update_nps_surveys_updated_at BEFORE UPDATE ON nps_surveys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed marketing data
INSERT INTO email_lists (name, slug, description, is_public) VALUES
  ('Newsletter', 'newsletter', 'Main newsletter subscribers', true),
  ('Product Updates', 'product-updates', 'Product announcements', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PART 2: SITE BUILDER MODULE
-- ============================================

CREATE TABLE IF NOT EXISTS sb_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  published_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sb_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES sb_pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  components JSONB NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page_id, version_number)
);

CREATE TABLE IF NOT EXISTS sb_page_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES sb_pages(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN (
    'hero', 'features', 'testimonials', 'cta', 'text', 'image',
    'video', 'spacer', 'divider', 'grid', 'columns', 'accordion',
    'tabs', 'gallery', 'stats', 'team', 'pricing', 'faq', 'contact'
  )),
  props JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL,
  parent_id UUID REFERENCES sb_page_components(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sb_component_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  component_type TEXT NOT NULL,
  preview_image TEXT,
  props JSONB NOT NULL DEFAULT '{}',
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Site Builder indexes
CREATE INDEX IF NOT EXISTS idx_sb_pages_slug ON sb_pages(slug);
CREATE INDEX IF NOT EXISTS idx_sb_pages_status ON sb_pages(status);
CREATE INDEX IF NOT EXISTS idx_sb_page_components_page_id ON sb_page_components(page_id);
CREATE INDEX IF NOT EXISTS idx_sb_page_components_order ON sb_page_components(page_id, order_index);

-- Site Builder RLS
ALTER TABLE sb_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_page_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_component_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published pages" ON sb_pages FOR SELECT USING (status = 'published');
CREATE POLICY "Public read published page components" ON sb_page_components FOR SELECT USING (page_id IN (SELECT id FROM sb_pages WHERE status = 'published'));
CREATE POLICY "Admin full access to pages" ON sb_pages FOR ALL USING (is_admin());
CREATE POLICY "Admin full access to page versions" ON sb_page_versions FOR ALL USING (is_admin());
CREATE POLICY "Admin full access to page components" ON sb_page_components FOR ALL USING (is_admin());
CREATE POLICY "Admin full access to component templates" ON sb_component_templates FOR ALL USING (is_admin());

-- Site Builder triggers
DROP TRIGGER IF EXISTS set_sb_pages_updated_at ON sb_pages;
CREATE TRIGGER set_sb_pages_updated_at BEFORE UPDATE ON sb_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_sb_page_components_updated_at ON sb_page_components;
CREATE TRIGGER set_sb_page_components_updated_at BEFORE UPDATE ON sb_page_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 3: TASK SYSTEM MODULE
-- ============================================

CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'gray',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to TEXT,
  assigned_to_email TEXT,
  due_date TIMESTAMPTZ,
  is_overdue BOOLEAN GENERATED ALWAYS AS (due_date IS NOT NULL AND due_date < now() AND status NOT IN ('done', 'cancelled')) STORED,
  completed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  author TEXT NOT NULL,
  author_email TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  reminder_at TIMESTAMPTZ NOT NULL,
  reminder_type TEXT DEFAULT 'email' CHECK (reminder_type IN ('email', 'notification', 'both')),
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Task System indexes
CREATE INDEX IF NOT EXISTS idx_task_categories_slug ON task_categories(slug);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_overdue ON tasks(is_overdue) WHERE is_overdue = true;
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task ON task_reminders(task_id);

-- Task System RLS
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with task_categories" ON task_categories;
DROP POLICY IF EXISTS "Admins can do everything with tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can do everything with task_comments" ON task_comments;
DROP POLICY IF EXISTS "Admins can do everything with task_reminders" ON task_reminders;

CREATE POLICY "Admins can do everything with task_categories" ON task_categories FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with tasks" ON tasks FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with task_comments" ON task_comments FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with task_reminders" ON task_reminders FOR ALL USING (is_admin());

-- Task System triggers
DROP TRIGGER IF EXISTS update_task_categories_updated_at ON task_categories;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;

CREATE TRIGGER update_task_categories_updated_at BEFORE UPDATE ON task_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update completed_at
CREATE OR REPLACE FUNCTION update_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_completed_at ON tasks;
CREATE TRIGGER update_task_completed_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_task_completed_at();

-- Seed task categories
INSERT INTO task_categories (slug, name, description, color, icon, sort_order) VALUES
  ('development', 'Development', 'Software development tasks', 'blue', 'code', 0),
  ('design', 'Design', 'UI/UX and graphic design tasks', 'purple', 'palette', 1),
  ('content', 'Content', 'Content creation and writing', 'green', 'file-text', 2),
  ('marketing', 'Marketing', 'Marketing and promotion tasks', 'orange', 'megaphone', 3),
  ('infrastructure', 'Infrastructure', 'DevOps and infrastructure', 'red', 'server', 4),
  ('bug', 'Bug Fix', 'Bug fixes and issue resolution', 'rose', 'bug', 6),
  ('feature', 'Feature', 'New features and enhancements', 'sky', 'sparkles', 7),
  ('other', 'Other', 'Other tasks', 'gray', 'circle', 99)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
SELECT 'Phase 3 migration completed successfully!' AS status;
