-- Migration: Marketing & Email Infrastructure
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
-- EMAIL SUBSCRIBERS
-- ============================================
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained')),

  -- Subscription preferences
  lists TEXT[] DEFAULT '{}', -- List IDs they're subscribed to
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',

  -- Engagement tracking
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  last_email_sent_at TIMESTAMPTZ,
  last_email_opened_at TIMESTAMPTZ,
  last_email_clicked_at TIMESTAMPTZ,
  total_emails_sent INTEGER DEFAULT 0,
  total_emails_opened INTEGER DEFAULT 0,
  total_emails_clicked INTEGER DEFAULT 0,

  -- Source tracking
  source TEXT, -- e.g., 'website', 'import', 'api'
  source_detail TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EMAIL LISTS
-- ============================================
CREATE TABLE IF NOT EXISTS email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Settings
  is_public BOOLEAN DEFAULT false,
  double_opt_in BOOLEAN DEFAULT true,

  -- Stats
  subscriber_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EMAIL CAMPAIGNS
-- ============================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,

  -- Content
  template_id UUID, -- references email_templates(id), nullable for now
  html_content TEXT,
  text_content TEXT,

  -- Targeting
  list_ids UUID[], -- Which lists to send to
  segment_rules JSONB, -- Advanced filtering rules
  exclude_tags TEXT[],

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Stats
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  complained_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,

  -- A/B Testing (future)
  is_ab_test BOOLEAN DEFAULT false,
  ab_test_config JSONB,

  created_by TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EMAIL TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Template type
  template_type TEXT DEFAULT 'custom' CHECK (template_type IN ('newsletter', 'transactional', 'promotional', 'custom')),

  -- Content
  subject_template TEXT,
  preview_text_template TEXT,
  html_content TEXT NOT NULL,
  text_content TEXT,

  -- Template variables (for rendering)
  variables JSONB DEFAULT '{}', -- { "name": { "type": "string", "default": "", "description": "" } }

  -- Preview
  thumbnail_url TEXT,

  -- Usage
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EMAIL EVENTS
-- ============================================
-- Track all email events for analytics
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),

  -- Who and what
  subscriber_id UUID REFERENCES email_subscribers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,

  -- Event details
  link_url TEXT, -- For clicked events
  bounce_type TEXT, -- 'hard' or 'soft'
  bounce_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,

  -- Metadata from email provider
  provider_message_id TEXT,
  provider_event_id TEXT,
  provider_metadata JSONB DEFAULT '{}',

  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NPS SURVEYS
-- ============================================
CREATE TABLE IF NOT EXISTS nps_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  question TEXT NOT NULL DEFAULT 'How likely are you to recommend us to a friend or colleague?',

  -- Targeting
  target_segment TEXT, -- 'all', 'active_users', 'recent_customers', etc.
  segment_rules JSONB,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed')),

  -- Scheduling
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  -- Stats
  responses_count INTEGER DEFAULT 0,
  promoters_count INTEGER DEFAULT 0, -- 9-10
  passives_count INTEGER DEFAULT 0,  -- 7-8
  detractors_count INTEGER DEFAULT 0, -- 0-6
  nps_score NUMERIC, -- (promoters - detractors) / total * 100

  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NPS RESPONSES
-- ============================================
CREATE TABLE IF NOT EXISTS nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES nps_surveys(id) ON DELETE CASCADE,

  -- Respondent (nullable for anonymous)
  email TEXT,
  subscriber_id UUID REFERENCES email_subscribers(id) ON DELETE SET NULL,

  -- Response
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,

  -- Classification
  category TEXT GENERATED ALWAYS AS (
    CASE
      WHEN score >= 9 THEN 'promoter'
      WHEN score >= 7 THEN 'passive'
      ELSE 'detractor'
    END
  ) STORED,

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,

  responded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CONTENT SUGGESTIONS
-- ============================================
-- AI-generated content suggestions for marketing
CREATE TABLE IF NOT EXISTS content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What type of content
  content_type TEXT NOT NULL CHECK (content_type IN ('email_subject', 'email_body', 'social_post', 'blog_title', 'landing_page_copy')),

  -- Input/context
  prompt TEXT NOT NULL,
  context JSONB DEFAULT '{}',

  -- AI output
  suggestions JSONB NOT NULL, -- Array of generated suggestions
  model TEXT, -- AI model used

  -- Usage
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'used')),
  selected_suggestion INTEGER, -- Index of chosen suggestion
  used_in_campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,

  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON email_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_lists ON email_subscribers USING GIN(lists);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_tags ON email_subscribers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_created ON email_subscribers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_lists_slug ON email_lists(slug);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON email_campaigns(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created ON email_campaigns(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_subscriber ON email_events(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_occurred ON email_events(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_nps_surveys_status ON nps_surveys(status);
CREATE INDEX IF NOT EXISTS idx_nps_responses_survey ON nps_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_category ON nps_responses(category);
CREATE INDEX IF NOT EXISTS idx_nps_responses_responded ON nps_responses(responded_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_suggestions_type ON content_suggestions(content_type);
CREATE INDEX IF NOT EXISTS idx_content_suggestions_status ON content_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_content_suggestions_created ON content_suggestions(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_suggestions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (for idempotency)
DROP POLICY IF EXISTS "Admins can do everything with email_subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Admins can do everything with email_lists" ON email_lists;
DROP POLICY IF EXISTS "Admins can do everything with email_campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Admins can do everything with email_templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can view email_events" ON email_events;
DROP POLICY IF EXISTS "Admins can do everything with nps_surveys" ON nps_surveys;
DROP POLICY IF EXISTS "Public can respond to active surveys" ON nps_responses;
DROP POLICY IF EXISTS "Admins can view nps_responses" ON nps_responses;
DROP POLICY IF EXISTS "Admins can do everything with content_suggestions" ON content_suggestions;

-- Create policies
CREATE POLICY "Admins can do everything with email_subscribers" ON email_subscribers FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with email_lists" ON email_lists FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with email_campaigns" ON email_campaigns FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with email_templates" ON email_templates FOR ALL USING (is_admin());
CREATE POLICY "Admins can view email_events" ON email_events FOR SELECT USING (is_admin());
CREATE POLICY "Admins can do everything with nps_surveys" ON nps_surveys FOR ALL USING (is_admin());

-- Allow public to submit NPS responses for active surveys
CREATE POLICY "Public can respond to active surveys" ON nps_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nps_surveys
      WHERE nps_surveys.id = nps_responses.survey_id
      AND nps_surveys.status = 'active'
      AND (nps_surveys.starts_at IS NULL OR nps_surveys.starts_at <= now())
      AND (nps_surveys.ends_at IS NULL OR nps_surveys.ends_at > now())
    )
  );

CREATE POLICY "Admins can view nps_responses" ON nps_responses FOR SELECT USING (is_admin());
CREATE POLICY "Admins can do everything with content_suggestions" ON content_suggestions FOR ALL USING (is_admin());

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_email_subscribers_updated_at ON email_subscribers;
CREATE TRIGGER update_email_subscribers_updated_at
  BEFORE UPDATE ON email_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_lists_updated_at ON email_lists;
CREATE TRIGGER update_email_lists_updated_at
  BEFORE UPDATE ON email_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nps_surveys_updated_at ON nps_surveys;
CREATE TRIGGER update_nps_surveys_updated_at
  BEFORE UPDATE ON nps_surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

-- Update email event stats on subscriber
CREATE OR REPLACE FUNCTION update_subscriber_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'sent' THEN
    UPDATE email_subscribers
    SET total_emails_sent = total_emails_sent + 1,
        last_email_sent_at = NEW.occurred_at,
        updated_at = now()
    WHERE id = NEW.subscriber_id;
  ELSIF NEW.event_type = 'opened' THEN
    UPDATE email_subscribers
    SET total_emails_opened = total_emails_opened + 1,
        last_email_opened_at = NEW.occurred_at,
        updated_at = now()
    WHERE id = NEW.subscriber_id;
  ELSIF NEW.event_type = 'clicked' THEN
    UPDATE email_subscribers
    SET total_emails_clicked = total_emails_clicked + 1,
        last_email_clicked_at = NEW.occurred_at,
        updated_at = now()
    WHERE id = NEW.subscriber_id;
  ELSIF NEW.event_type = 'bounced' THEN
    -- Mark as bounced if hard bounce
    IF NEW.bounce_type = 'hard' THEN
      UPDATE email_subscribers
      SET status = 'bounced',
          updated_at = now()
      WHERE id = NEW.subscriber_id;
    END IF;
  ELSIF NEW.event_type = 'complained' THEN
    UPDATE email_subscribers
    SET status = 'complained',
        updated_at = now()
    WHERE id = NEW.subscriber_id;
  ELSIF NEW.event_type = 'unsubscribed' THEN
    UPDATE email_subscribers
    SET status = 'unsubscribed',
        unsubscribed_at = NEW.occurred_at,
        updated_at = now()
    WHERE id = NEW.subscriber_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_subscriber_stats_on_event ON email_events;
CREATE TRIGGER update_subscriber_stats_on_event
  AFTER INSERT ON email_events
  FOR EACH ROW EXECUTE FUNCTION update_subscriber_stats();

-- Update campaign stats on email event
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'sent' THEN
    UPDATE email_campaigns SET sent_count = sent_count + 1 WHERE id = NEW.campaign_id;
  ELSIF NEW.event_type = 'delivered' THEN
    UPDATE email_campaigns SET delivered_count = delivered_count + 1 WHERE id = NEW.campaign_id;
  ELSIF NEW.event_type = 'opened' THEN
    UPDATE email_campaigns SET opened_count = opened_count + 1 WHERE id = NEW.campaign_id;
  ELSIF NEW.event_type = 'clicked' THEN
    UPDATE email_campaigns SET clicked_count = clicked_count + 1 WHERE id = NEW.campaign_id;
  ELSIF NEW.event_type = 'bounced' THEN
    UPDATE email_campaigns SET bounced_count = bounced_count + 1 WHERE id = NEW.campaign_id;
  ELSIF NEW.event_type = 'complained' THEN
    UPDATE email_campaigns SET complained_count = complained_count + 1 WHERE id = NEW.campaign_id;
  ELSIF NEW.event_type = 'unsubscribed' THEN
    UPDATE email_campaigns SET unsubscribed_count = unsubscribed_count + 1 WHERE id = NEW.campaign_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_campaign_stats_on_event ON email_events;
CREATE TRIGGER update_campaign_stats_on_event
  AFTER INSERT ON email_events
  FOR EACH ROW EXECUTE FUNCTION update_campaign_stats();

-- Update NPS survey stats on new response
CREATE OR REPLACE FUNCTION update_nps_survey_stats()
RETURNS TRIGGER AS $$
DECLARE
  promoters INTEGER;
  passives INTEGER;
  detractors INTEGER;
  total INTEGER;
  score NUMERIC;
BEGIN
  -- Count responses by category
  SELECT
    COUNT(*) FILTER (WHERE category = 'promoter'),
    COUNT(*) FILTER (WHERE category = 'passive'),
    COUNT(*) FILTER (WHERE category = 'detractor'),
    COUNT(*)
  INTO promoters, passives, detractors, total
  FROM nps_responses
  WHERE survey_id = NEW.survey_id;

  -- Calculate NPS: ((promoters - detractors) / total) * 100
  IF total > 0 THEN
    score := ((promoters - detractors)::NUMERIC / total) * 100;
  ELSE
    score := 0;
  END IF;

  -- Update survey
  UPDATE nps_surveys
  SET responses_count = total,
      promoters_count = promoters,
      passives_count = passives,
      detractors_count = detractors,
      nps_score = score,
      updated_at = now()
  WHERE id = NEW.survey_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_nps_survey_stats_on_response ON nps_responses;
CREATE TRIGGER update_nps_survey_stats_on_response
  AFTER INSERT ON nps_responses
  FOR EACH ROW EXECUTE FUNCTION update_nps_survey_stats();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate engagement score for a subscriber
CREATE OR REPLACE FUNCTION calculate_subscriber_engagement(subscriber_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  engagement_score NUMERIC := 0;
  sub RECORD;
BEGIN
  SELECT * INTO sub FROM email_subscribers WHERE id = subscriber_uuid;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Simple engagement formula (can be customized)
  -- Opened = 3 points, Clicked = 5 points
  IF sub.total_emails_sent > 0 THEN
    engagement_score := (
      (sub.total_emails_opened * 3.0 + sub.total_emails_clicked * 5.0)
      / sub.total_emails_sent
    );
  END IF;

  RETURN engagement_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- SEED DEFAULT DATA
-- ============================================

-- Default email list
INSERT INTO email_lists (name, slug, description, is_public)
VALUES
  ('Newsletter', 'newsletter', 'Main newsletter subscribers', true),
  ('Product Updates', 'product-updates', 'Product announcements and updates', true),
  ('Blog Subscribers', 'blog-subscribers', 'New blog post notifications', true)
ON CONFLICT (slug) DO NOTHING;

-- Default email templates
INSERT INTO email_templates (name, slug, template_type, subject_template, html_content, text_content, variables)
VALUES (
  'Basic Newsletter',
  'basic-newsletter',
  'newsletter',
  '{{subject}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb;">{{title}}</h1>
  </div>

  <div style="margin-bottom: 30px;">
    {{content}}
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280;">
    <p>You received this email because you subscribed to our newsletter.</p>
    <p><a href="{{unsubscribe_url}}" style="color: #2563eb;">Unsubscribe</a></p>
  </div>
</body>
</html>',
  '{{title}}

{{content}}

---
You received this email because you subscribed to our newsletter.
Unsubscribe: {{unsubscribe_url}}',
  '{"subject": {"type": "string", "description": "Email subject"}, "title": {"type": "string", "description": "Main heading"}, "content": {"type": "html", "description": "Email body content"}, "unsubscribe_url": {"type": "string", "description": "Unsubscribe link"}}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Migration complete!
SELECT 'Migration 003_marketing completed successfully' AS status;
