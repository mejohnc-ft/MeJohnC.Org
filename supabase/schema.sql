-- Resume Site Database Schema
-- Run this in Supabase SQL Editor

-- App Suites (groupings of apps)
CREATE TABLE IF NOT EXISTS app_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Apps
CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID REFERENCES app_suites(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tagline TEXT,
  description TEXT, -- Markdown content for sub-page
  icon_url TEXT, -- Large app icon
  external_url TEXT, -- Link-out URL (optional)
  demo_url TEXT, -- Embedded demo URL (optional)
  tech_stack TEXT[], -- Array of technologies
  status TEXT DEFAULT 'published', -- draft, published, archived
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL, -- Markdown content
  cover_image TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'draft', -- draft, published, scheduled
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ, -- For scheduled publishing
  reading_time INTEGER, -- Calculated on save
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tagline TEXT,
  description TEXT, -- Markdown content
  cover_image TEXT,
  external_url TEXT,
  tech_stack TEXT[],
  status TEXT DEFAULT 'draft', -- draft, published, scheduled
  scheduled_for TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Site Content (About, Projects intro, etc.)
CREATE TABLE IF NOT EXISTS site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contact Links
CREATE TABLE IF NOT EXISTS contact_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  value TEXT,
  description TEXT,
  icon TEXT NOT NULL, -- email, linkedin, github, twitter, calendar
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Work History
CREATE TABLE IF NOT EXISTS work_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  period TEXT NOT NULL,
  highlights TEXT[] DEFAULT '{}',
  tech TEXT[] DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Case Studies
CREATE TABLE IF NOT EXISTS case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric TEXT NOT NULL,
  title TEXT NOT NULL,
  before_content TEXT NOT NULL,
  after_content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Timelines
CREATE TABLE IF NOT EXISTS timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  chart_type TEXT DEFAULT 'growth', -- growth, linear, decline
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Timeline Entries
CREATE TABLE IF NOT EXISTS timeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  phase TEXT NOT NULL,
  summary TEXT,
  content TEXT, -- Markdown content for detailed view
  dot_position NUMERIC DEFAULT 0.5, -- Position on timeline (0-1)
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users (for checking admin access)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_apps_suite_id ON apps(suite_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_app_suites_slug ON app_suites(slug);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_timelines_slug ON timelines(slug);
CREATE INDEX IF NOT EXISTS idx_timelines_is_active ON timelines(is_active);
CREATE INDEX IF NOT EXISTS idx_timeline_entries_timeline_id ON timeline_entries(timeline_id);
CREATE INDEX IF NOT EXISTS idx_site_content_key ON site_content(key);
CREATE INDEX IF NOT EXISTS idx_contact_links_order ON contact_links(order_index);
CREATE INDEX IF NOT EXISTS idx_work_history_order ON work_history(order_index);
CREATE INDEX IF NOT EXISTS idx_case_studies_order ON case_studies(order_index);

-- Enable Row Level Security
ALTER TABLE app_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin (checks JWT email against admin_users table)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies: Public read for published content
CREATE POLICY "Public can view non-archived apps" ON apps
  FOR SELECT USING (status != 'archived');

CREATE POLICY "Public can view app suites" ON app_suites
  FOR SELECT USING (true);

CREATE POLICY "Public can view published blog posts" ON blog_posts
  FOR SELECT USING (status = 'published' OR (status = 'scheduled' AND scheduled_for <= now()));

CREATE POLICY "Public can view published projects" ON projects
  FOR SELECT USING (status = 'published' OR (status = 'scheduled' AND scheduled_for <= now()));

CREATE POLICY "Public can view site content" ON site_content
  FOR SELECT USING (true);

CREATE POLICY "Public can view contact links" ON contact_links
  FOR SELECT USING (true);

CREATE POLICY "Public can view work history" ON work_history
  FOR SELECT USING (true);

CREATE POLICY "Public can view case studies" ON case_studies
  FOR SELECT USING (true);

CREATE POLICY "Public can view active timelines" ON timelines
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view timeline entries" ON timeline_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM timelines
      WHERE timelines.id = timeline_entries.timeline_id
      AND timelines.is_active = true
    )
  );

-- RLS Policies: Admin full access (authenticated users in admin_users table)
CREATE POLICY "Admins can do everything with apps" ON apps
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with app_suites" ON app_suites
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with blog_posts" ON blog_posts
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with projects" ON projects
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with site_content" ON site_content
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with contact_links" ON contact_links
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with work_history" ON work_history
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with case_studies" ON case_studies
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with timelines" ON timelines
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with timeline_entries" ON timeline_entries
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can view admin_users" ON admin_users
  FOR SELECT USING (is_admin());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_suites_updated_at
  BEFORE UPDATE ON app_suites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_content_updated_at
  BEFORE UPDATE ON site_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_links_updated_at
  BEFORE UPDATE ON contact_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_history_updated_at
  BEFORE UPDATE ON work_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_studies_updated_at
  BEFORE UPDATE ON case_studies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timelines_updated_at
  BEFORE UPDATE ON timelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_entries_updated_at
  BEFORE UPDATE ON timeline_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert your admin email (replace with your email)
-- INSERT INTO admin_users (email) VALUES ('your-email@example.com');
