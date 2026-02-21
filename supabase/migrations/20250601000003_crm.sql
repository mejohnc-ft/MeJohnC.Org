-- CRM Database Schema
-- Run this in Supabase SQL Editor after schema.sql
-- Manages contacts, leads, interactions, and follow-up reminders

-- ============================================
-- CONTACTS (main contact records)
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,

  -- Online presence
  website TEXT,
  linkedin_url TEXT,
  twitter_handle TEXT,
  github_username TEXT,

  -- Classification
  contact_type TEXT DEFAULT 'lead' CHECK (contact_type IN ('lead', 'prospect', 'client', 'partner', 'vendor', 'personal', 'other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  lead_score INTEGER DEFAULT 0,  -- 0-100 scoring for lead quality

  -- Source tracking
  source TEXT,  -- How they found you: 'website', 'referral', 'conference', 'linkedin', etc.
  source_detail TEXT,  -- Additional source info
  referrer_id UUID REFERENCES contacts(id),  -- Who referred them

  -- Location
  city TEXT,
  state TEXT,
  country TEXT,
  timezone TEXT,

  -- Profile
  avatar_url TEXT,
  bio TEXT,
  notes TEXT,  -- General notes

  -- Tags for flexible categorization
  tags TEXT[] DEFAULT '{}',

  -- Custom fields (JSONB for flexibility)
  custom_fields JSONB DEFAULT '{}',

  -- Timestamps
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INTERACTIONS (contact activity log)
-- ============================================
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Interaction details
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'email_sent', 'email_received',
    'call_outbound', 'call_inbound',
    'meeting', 'video_call',
    'message', 'linkedin_message',
    'note', 'task_completed',
    'website_visit', 'form_submission',
    'other'
  )),
  subject TEXT,
  content TEXT,  -- Full content/notes about the interaction

  -- Metadata
  duration_minutes INTEGER,  -- For calls/meetings
  outcome TEXT,  -- 'positive', 'neutral', 'negative', 'no_response'
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),

  -- Related items
  related_url TEXT,  -- Link to email, calendar event, etc.
  attachments JSONB DEFAULT '[]',  -- Array of {name, url, type}

  -- Timestamps
  occurred_at TIMESTAMPTZ DEFAULT now(),  -- When the interaction happened
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT  -- User who logged this
);

-- ============================================
-- FOLLOW_UPS (reminders and scheduled tasks)
-- ============================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  follow_up_type TEXT DEFAULT 'reminder' CHECK (follow_up_type IN (
    'reminder', 'call', 'email', 'meeting', 'task', 'review'
  )),

  -- Scheduling
  due_at TIMESTAMPTZ NOT NULL,
  remind_at TIMESTAMPTZ,  -- When to send reminder notification

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'snoozed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  completion_notes TEXT,

  -- Recurrence (optional)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,  -- iCal RRULE format
  parent_follow_up_id UUID REFERENCES follow_ups(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

-- ============================================
-- CONTACT_LISTS (grouping contacts)
-- ============================================
CREATE TABLE IF NOT EXISTS contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- List type
  list_type TEXT DEFAULT 'static' CHECK (list_type IN ('static', 'smart')),
  smart_filter JSONB,  -- Filter rules for smart lists

  -- Display
  color TEXT DEFAULT 'blue',
  icon TEXT,

  -- Stats (cached)
  contact_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CONTACT_LIST_MEMBERS (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS contact_list_members (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  list_id UUID REFERENCES contact_lists(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by TEXT,
  PRIMARY KEY (contact_id, list_id)
);

-- ============================================
-- PIPELINES (sales/deal stages)
-- ============================================
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PIPELINE_STAGES
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT DEFAULT 'gray',
  sort_order INTEGER DEFAULT 0,

  -- Stage behavior
  is_won BOOLEAN DEFAULT false,  -- Marks deal as won
  is_lost BOOLEAN DEFAULT false,  -- Marks deal as lost

  -- Probability for forecasting
  probability INTEGER DEFAULT 0,  -- 0-100%

  UNIQUE(pipeline_id, slug)
);

-- ============================================
-- DEALS (opportunities)
-- ============================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Deal info
  name TEXT NOT NULL,
  value DECIMAL(12, 2),
  currency TEXT DEFAULT 'USD',

  -- Pipeline position
  pipeline_id UUID NOT NULL REFERENCES pipelines(id),
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id),

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  close_date TIMESTAMPTZ,
  lost_reason TEXT,

  -- Tracking
  probability INTEGER,  -- Override stage probability
  expected_revenue DECIMAL(12, 2),  -- value * probability

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contacted ON contacts(last_contacted_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_next_follow_up ON contacts(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_occurred ON interactions(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_follow_ups_contact ON follow_ups(contact_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due ON follow_ups(due_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_remind ON follow_ups(remind_at) WHERE status = 'pending' AND remind_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_lists_slug ON contact_lists(slug);
CREATE INDEX IF NOT EXISTS idx_contact_list_members_contact ON contact_list_members(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_list_members_list ON contact_list_members(list_id);

CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON deals(close_date) WHERE status = 'open';

-- Full-text search on contacts
CREATE INDEX IF NOT EXISTS idx_contacts_fts ON contacts
  USING GIN(to_tsvector('english',
    coalesce(first_name, '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(company, '') || ' ' ||
    coalesce(notes, '')
  ));

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can do everything with contacts" ON contacts FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with interactions" ON interactions FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with follow_ups" ON follow_ups FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with contact_lists" ON contact_lists FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with contact_list_members" ON contact_list_members FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with pipelines" ON pipelines FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with pipeline_stages" ON pipeline_stages FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with deals" ON deals FOR ALL USING (is_admin());

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_lists_updated_at
  BEFORE UPDATE ON contact_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update contact list count
CREATE OR REPLACE FUNCTION update_contact_list_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE contact_lists SET contact_count = contact_count + 1, updated_at = now() WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE contact_lists SET contact_count = contact_count - 1, updated_at = now() WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_list_count_on_insert
  AFTER INSERT ON contact_list_members
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_list_count();

CREATE TRIGGER update_list_count_on_delete
  AFTER DELETE ON contact_list_members
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_list_count();

-- Update contact's last_contacted_at when interaction is logged
CREATE OR REPLACE FUNCTION update_contact_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts
  SET last_contacted_at = NEW.occurred_at, updated_at = now()
  WHERE id = NEW.contact_id
  AND (last_contacted_at IS NULL OR last_contacted_at < NEW.occurred_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_contact_on_interaction
  AFTER INSERT ON interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_last_interaction();

-- Update deal expected_revenue
CREATE OR REPLACE FUNCTION update_deal_expected_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.value IS NOT NULL AND NEW.probability IS NOT NULL THEN
    NEW.expected_revenue = NEW.value * NEW.probability / 100;
  ELSIF NEW.value IS NOT NULL THEN
    -- Use stage probability if deal probability not set
    SELECT NEW.value * probability / 100 INTO NEW.expected_revenue
    FROM pipeline_stages WHERE id = NEW.stage_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_deal_expected_revenue
  BEFORE INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_expected_revenue();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Search contacts
CREATE OR REPLACE FUNCTION search_contacts(search_query TEXT)
RETURNS SETOF contacts AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM contacts
  WHERE to_tsvector('english',
    coalesce(first_name, '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(company, '') || ' ' ||
    coalesce(notes, '')
  ) @@ plainto_tsquery('english', search_query)
  ORDER BY ts_rank(
    to_tsvector('english',
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(company, '') || ' ' ||
      coalesce(notes, '')
    ),
    plainto_tsquery('english', search_query)
  ) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get overdue follow-ups
CREATE OR REPLACE FUNCTION get_overdue_follow_ups()
RETURNS SETOF follow_ups AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM follow_ups
  WHERE status = 'pending' AND due_at < now()
  ORDER BY due_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get upcoming follow-ups
CREATE OR REPLACE FUNCTION get_upcoming_follow_ups(days_ahead INTEGER DEFAULT 7)
RETURNS SETOF follow_ups AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM follow_ups
  WHERE status = 'pending'
    AND due_at >= now()
    AND due_at <= now() + (days_ahead || ' days')::INTERVAL
  ORDER BY due_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA
-- ============================================

-- Default pipeline
INSERT INTO pipelines (name, slug, description, is_default) VALUES
  ('Sales Pipeline', 'sales', 'Default sales pipeline', true)
ON CONFLICT (slug) DO NOTHING;

-- Default pipeline stages
INSERT INTO pipeline_stages (pipeline_id, name, slug, color, sort_order, probability)
SELECT p.id, s.name, s.slug, s.color, s.sort_order, s.probability
FROM pipelines p
CROSS JOIN (VALUES
  ('Lead', 'lead', 'gray', 0, 10),
  ('Qualified', 'qualified', 'blue', 1, 25),
  ('Proposal', 'proposal', 'purple', 2, 50),
  ('Negotiation', 'negotiation', 'orange', 3, 75),
  ('Won', 'won', 'green', 4, 100),
  ('Lost', 'lost', 'red', 5, 0)
) AS s(name, slug, color, sort_order, probability)
WHERE p.slug = 'sales'
ON CONFLICT (pipeline_id, slug) DO NOTHING;

-- Update won/lost flags
UPDATE pipeline_stages SET is_won = true WHERE slug = 'won';
UPDATE pipeline_stages SET is_lost = true WHERE slug = 'lost';

-- Default contact lists
INSERT INTO contact_lists (name, slug, description, color) VALUES
  ('Hot Leads', 'hot-leads', 'High priority leads requiring immediate attention', 'red'),
  ('Newsletter', 'newsletter', 'Contacts subscribed to newsletter', 'blue'),
  ('Clients', 'clients', 'Active clients', 'green'),
  ('Partners', 'partners', 'Business partners and collaborators', 'purple')
ON CONFLICT (slug) DO NOTHING;
