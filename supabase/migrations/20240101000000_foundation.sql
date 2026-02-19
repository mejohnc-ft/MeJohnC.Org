-- =====================================================================
-- FOUNDATION MIGRATION: Consolidated from all pre-2026 migrations
-- Created: 2026-02-18
--
-- This single idempotent migration replaces:
--   schema.sql, 001-006, 20240601000001-000012, news/001_initial.sql
--
-- All CREATE TRIGGER use DROP IF EXISTS + CREATE pattern
-- All CREATE POLICY use DROP IF EXISTS + CREATE pattern
-- CREATE FUNCTION uses CREATE OR REPLACE (never inside DO $$ blocks)
-- =====================================================================

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;


-- ============================================
-- 2-3. BASE TABLES + FUNCTIONS (from schema.sql)
-- ============================================

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
DROP POLICY IF EXISTS "Public can view non-archived apps" ON apps;
CREATE POLICY "Public can view non-archived apps" ON apps
  FOR SELECT USING (status != 'archived');

DROP POLICY IF EXISTS "Public can view app suites" ON app_suites;
CREATE POLICY "Public can view app suites" ON app_suites
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view published blog posts" ON blog_posts;
CREATE POLICY "Public can view published blog posts" ON blog_posts
  FOR SELECT USING (status = 'published' OR (status = 'scheduled' AND scheduled_for <= now()));

DROP POLICY IF EXISTS "Public can view published projects" ON projects;
CREATE POLICY "Public can view published projects" ON projects
  FOR SELECT USING (status = 'published' OR (status = 'scheduled' AND scheduled_for <= now()));

DROP POLICY IF EXISTS "Public can view site content" ON site_content;
CREATE POLICY "Public can view site content" ON site_content
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view contact links" ON contact_links;
CREATE POLICY "Public can view contact links" ON contact_links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view work history" ON work_history;
CREATE POLICY "Public can view work history" ON work_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view case studies" ON case_studies;
CREATE POLICY "Public can view case studies" ON case_studies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view active timelines" ON timelines;
CREATE POLICY "Public can view active timelines" ON timelines
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view timeline entries" ON timeline_entries;
CREATE POLICY "Public can view timeline entries" ON timeline_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM timelines
      WHERE timelines.id = timeline_entries.timeline_id
      AND timelines.is_active = true
    )
  );

-- RLS Policies: Admin full access (authenticated users in admin_users table)
DROP POLICY IF EXISTS "Admins can do everything with apps" ON apps;
CREATE POLICY "Admins can do everything with apps" ON apps
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with app_suites" ON app_suites;
CREATE POLICY "Admins can do everything with app_suites" ON app_suites
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with blog_posts" ON blog_posts;
CREATE POLICY "Admins can do everything with blog_posts" ON blog_posts
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with projects" ON projects;
CREATE POLICY "Admins can do everything with projects" ON projects
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with site_content" ON site_content;
CREATE POLICY "Admins can do everything with site_content" ON site_content
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with contact_links" ON contact_links;
CREATE POLICY "Admins can do everything with contact_links" ON contact_links
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with work_history" ON work_history;
CREATE POLICY "Admins can do everything with work_history" ON work_history
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with case_studies" ON case_studies;
CREATE POLICY "Admins can do everything with case_studies" ON case_studies
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with timelines" ON timelines;
CREATE POLICY "Admins can do everything with timelines" ON timelines
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with timeline_entries" ON timeline_entries;
CREATE POLICY "Admins can do everything with timeline_entries" ON timeline_entries
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;
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
DROP TRIGGER IF EXISTS update_apps_updated_at ON apps;
CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_suites_updated_at ON app_suites;
CREATE TRIGGER update_app_suites_updated_at
  BEFORE UPDATE ON app_suites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_content_updated_at ON site_content;
CREATE TRIGGER update_site_content_updated_at
  BEFORE UPDATE ON site_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contact_links_updated_at ON contact_links;
CREATE TRIGGER update_contact_links_updated_at
  BEFORE UPDATE ON contact_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_history_updated_at ON work_history;
CREATE TRIGGER update_work_history_updated_at
  BEFORE UPDATE ON work_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_case_studies_updated_at ON case_studies;
CREATE TRIGGER update_case_studies_updated_at
  BEFORE UPDATE ON case_studies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_timelines_updated_at ON timelines;
CREATE TRIGGER update_timelines_updated_at
  BEFORE UPDATE ON timelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_timeline_entries_updated_at ON timeline_entries;
CREATE TRIGGER update_timeline_entries_updated_at
  BEFORE UPDATE ON timeline_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert your admin email (replace with your email)
-- INSERT INTO admin_users (email) VALUES ('your-email@example.com');


-- ============================================
-- 4. AGENT + BOOKMARK TABLES (from 001_agent_and_bookmarks.sql)
-- ============================================

-- Combined Migration: Agent & Bookmarks Infrastructure
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql must be applied first (provides is_admin() and update_updated_at_column())
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

-- ============================================
-- PART 1: AGENT TABLES
-- ============================================

-- Agent Commands (input queue)
CREATE TABLE IF NOT EXISTS agent_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  command_type TEXT NOT NULL CHECK (command_type IN ('chat', 'task', 'cancel')),
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'processing', 'completed', 'failed', 'cancelled')),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Agent Responses (output stream)
CREATE TABLE IF NOT EXISTS agent_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID REFERENCES agent_commands(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('message', 'tool_use', 'tool_result', 'progress', 'error', 'complete', 'confirmation_request')),
  content TEXT,
  tool_name TEXT,
  tool_input JSONB,
  tool_result JSONB,
  is_streaming BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Tasks (scheduled and background)
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('scheduled', 'triggered', 'manual')),
  schedule TEXT,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed', 'disabled')),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_error TEXT,
  run_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Task Runs
CREATE TABLE IF NOT EXISTS agent_task_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  output TEXT,
  error TEXT,
  metrics JSONB DEFAULT '{}',
  triggered_by TEXT
);

-- Agent Sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  title TEXT,
  is_active BOOLEAN DEFAULT true,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Config
CREATE TABLE IF NOT EXISTS agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Agent Confirmations
CREATE TABLE IF NOT EXISTS agent_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  command_id UUID REFERENCES agent_commands(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '5 minutes'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Indexes
CREATE INDEX IF NOT EXISTS idx_agent_commands_session ON agent_commands(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_commands_status ON agent_commands(status);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created ON agent_commands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_commands_pending ON agent_commands(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_responses_command ON agent_responses(command_id);
CREATE INDEX IF NOT EXISTS idx_agent_responses_session ON agent_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_responses_created ON agent_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_next_run ON agent_tasks(next_run_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type ON agent_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_agent_task_runs_task ON agent_task_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_task_runs_status ON agent_task_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_task_runs_started ON agent_task_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_active ON agent_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_config_key ON agent_config(key);
CREATE INDEX IF NOT EXISTS idx_agent_confirmations_session ON agent_confirmations(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_confirmations_pending ON agent_confirmations(status) WHERE status = 'pending';

-- Agent RLS
ALTER TABLE agent_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_task_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_confirmations ENABLE ROW LEVEL SECURITY;

-- Agent Policies (drop first to make idempotent)
DROP POLICY IF EXISTS "Admins can do everything with agent_commands" ON agent_commands;
DROP POLICY IF EXISTS "Admins can do everything with agent_responses" ON agent_responses;
DROP POLICY IF EXISTS "Admins can do everything with agent_tasks" ON agent_tasks;
DROP POLICY IF EXISTS "Admins can view agent_task_runs" ON agent_task_runs;
DROP POLICY IF EXISTS "Admins can do everything with agent_sessions" ON agent_sessions;
DROP POLICY IF EXISTS "Admins can do everything with agent_config" ON agent_config;
DROP POLICY IF EXISTS "Admins can do everything with agent_confirmations" ON agent_confirmations;

CREATE POLICY "Admins can do everything with agent_commands" ON agent_commands FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with agent_responses" ON agent_responses FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Admins can do everything with agent_tasks" ON agent_tasks;
CREATE POLICY "Admins can do everything with agent_tasks" ON agent_tasks FOR ALL USING (is_admin());
CREATE POLICY "Admins can view agent_task_runs" ON agent_task_runs FOR SELECT USING (is_admin());
CREATE POLICY "Admins can do everything with agent_sessions" ON agent_sessions FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Admins can do everything with agent_config" ON agent_config;
CREATE POLICY "Admins can do everything with agent_config" ON agent_config FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with agent_confirmations" ON agent_confirmations FOR ALL USING (is_admin());

-- Agent Triggers (drop first to make idempotent)
DROP TRIGGER IF EXISTS update_agent_tasks_updated_at ON agent_tasks;
DROP TRIGGER IF EXISTS update_agent_sessions_updated_at ON agent_sessions;
DROP TRIGGER IF EXISTS update_agent_config_updated_at ON agent_config;
DROP TRIGGER IF EXISTS increment_session_message_count ON agent_commands;

CREATE TRIGGER update_agent_tasks_updated_at BEFORE UPDATE ON agent_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_sessions_updated_at BEFORE UPDATE ON agent_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_config_updated_at BEFORE UPDATE ON agent_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agent Helper Functions
CREATE OR REPLACE FUNCTION cleanup_expired_confirmations()
RETURNS void AS $$
BEGIN
  UPDATE agent_confirmations SET status = 'expired' WHERE status = 'pending' AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_sessions SET message_count = message_count + 1, last_message_at = now(), updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS increment_session_message_count ON agent_commands;
CREATE TRIGGER increment_session_message_count AFTER INSERT ON agent_commands FOR EACH ROW EXECUTE FUNCTION update_session_message_count();

-- Agent Config Seed
INSERT INTO agent_config (key, value, description, is_secret) VALUES
  ('agent_model', '"claude-sonnet-4-20250514"', 'Default Claude model for agent responses', false),
  ('max_tokens', '4096', 'Maximum tokens for Claude responses', false),
  ('confirmation_timeout_minutes', '5', 'Time before pending confirmations expire', false),
  ('allowed_file_extensions', '[".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".sql", ".html"]', 'File types agent can read/write', false),
  ('repo_path', '""', 'Path to site repository on home server', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- PART 2: BOOKMARK TABLES
-- ============================================

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('twitter', 'pocket', 'raindrop', 'manual', 'other')),
  source_id TEXT,
  source_url TEXT,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  content TEXT,
  author TEXT,
  author_handle TEXT,
  author_avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  ai_summary TEXT,
  ai_tags TEXT[] DEFAULT '{}',
  ai_category TEXT,
  ai_processed_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  image_url TEXT,
  favicon_url TEXT,
  metadata JSONB DEFAULT '{}',
  published_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bookmark Collections
CREATE TABLE IF NOT EXISTS bookmark_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  color TEXT DEFAULT 'blue',
  is_public BOOLEAN DEFAULT false,
  is_smart BOOLEAN DEFAULT false,
  smart_rules JSONB,
  sort_order INTEGER DEFAULT 0,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bookmark Collection Items
CREATE TABLE IF NOT EXISTS bookmark_collection_items (
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES bookmark_collections(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (bookmark_id, collection_id)
);

-- Bookmark Import Jobs
CREATE TABLE IF NOT EXISTS bookmark_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  file_path TEXT,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  imported_items INTEGER DEFAULT 0,
  skipped_items INTEGER DEFAULT 0,
  error_log TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookmark Categories
CREATE TABLE IF NOT EXISTS bookmark_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'gray',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookmark Indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_source ON bookmarks(source);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);
CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
CREATE INDEX IF NOT EXISTS idx_bookmarks_source_id ON bookmarks(source, source_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_bookmarks_ai_tags ON bookmarks USING GIN(ai_tags);
CREATE INDEX IF NOT EXISTS idx_bookmarks_is_favorite ON bookmarks(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_bookmarks_is_public ON bookmarks(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_bookmarks_is_archived ON bookmarks(is_archived);
CREATE INDEX IF NOT EXISTS idx_bookmarks_imported ON bookmarks(imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_published ON bookmarks(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_author_handle ON bookmarks(author_handle);
CREATE INDEX IF NOT EXISTS idx_bookmarks_fts ON bookmarks USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')));
CREATE INDEX IF NOT EXISTS idx_bookmark_collections_slug ON bookmark_collections(slug);
CREATE INDEX IF NOT EXISTS idx_bookmark_collections_public ON bookmark_collections(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_bookmark_collections_order ON bookmark_collections(sort_order);
CREATE INDEX IF NOT EXISTS idx_bookmark_collection_items_bookmark ON bookmark_collection_items(bookmark_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_collection_items_collection ON bookmark_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_import_jobs_status ON bookmark_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bookmark_categories_slug ON bookmark_categories(slug);

-- Bookmark RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_categories ENABLE ROW LEVEL SECURITY;

-- Bookmark Policies (drop first to make idempotent)
DROP POLICY IF EXISTS "Public can view public bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Public can view public collections" ON bookmark_collections;
DROP POLICY IF EXISTS "Public can view public collection items" ON bookmark_collection_items;
DROP POLICY IF EXISTS "Public can view bookmark categories" ON bookmark_categories;
DROP POLICY IF EXISTS "Admins can do everything with bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Admins can do everything with bookmark_collections" ON bookmark_collections;
DROP POLICY IF EXISTS "Admins can do everything with bookmark_collection_items" ON bookmark_collection_items;
DROP POLICY IF EXISTS "Admins can do everything with bookmark_import_jobs" ON bookmark_import_jobs;
DROP POLICY IF EXISTS "Admins can do everything with bookmark_categories" ON bookmark_categories;

CREATE POLICY "Public can view public bookmarks" ON bookmarks FOR SELECT USING (is_public = true AND is_archived = false);
CREATE POLICY "Public can view public collections" ON bookmark_collections FOR SELECT USING (is_public = true);
DROP POLICY IF EXISTS "Public can view public collection items" ON bookmark_collection_items;
CREATE POLICY "Public can view public collection items" ON bookmark_collection_items FOR SELECT USING (EXISTS (SELECT 1 FROM bookmark_collections WHERE bookmark_collections.id = bookmark_collection_items.collection_id AND bookmark_collections.is_public = true));
CREATE POLICY "Public can view bookmark categories" ON bookmark_categories FOR SELECT USING (true);
CREATE POLICY "Admins can do everything with bookmarks" ON bookmarks FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Admins can do everything with bookmark_collections" ON bookmark_collections;
CREATE POLICY "Admins can do everything with bookmark_collections" ON bookmark_collections FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with bookmark_collection_items" ON bookmark_collection_items FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with bookmark_import_jobs" ON bookmark_import_jobs FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Admins can do everything with bookmark_categories" ON bookmark_categories;
CREATE POLICY "Admins can do everything with bookmark_categories" ON bookmark_categories FOR ALL USING (is_admin());

-- Bookmark Triggers (drop first to make idempotent)
DROP TRIGGER IF EXISTS update_bookmarks_updated_at ON bookmarks;
DROP TRIGGER IF EXISTS update_bookmark_collections_updated_at ON bookmark_collections;
DROP TRIGGER IF EXISTS update_collection_count_on_insert ON bookmark_collection_items;
DROP TRIGGER IF EXISTS update_collection_count_on_delete ON bookmark_collection_items;

CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON bookmarks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookmark_collections_updated_at BEFORE UPDATE ON bookmark_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Collection Item Count Function
CREATE OR REPLACE FUNCTION update_collection_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bookmark_collections SET item_count = item_count + 1, updated_at = now() WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bookmark_collections SET item_count = item_count - 1, updated_at = now() WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_collection_count_on_insert ON bookmark_collection_items;
CREATE TRIGGER update_collection_count_on_insert AFTER INSERT ON bookmark_collection_items FOR EACH ROW EXECUTE FUNCTION update_collection_item_count();
CREATE TRIGGER update_collection_count_on_delete AFTER DELETE ON bookmark_collection_items FOR EACH ROW EXECUTE FUNCTION update_collection_item_count();

-- Full-text Search Function
CREATE OR REPLACE FUNCTION search_bookmarks(search_query TEXT)
RETURNS SETOF bookmarks AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM bookmarks
  WHERE to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')) @@ plainto_tsquery('english', search_query)
  ORDER BY ts_rank(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')), plainto_tsquery('english', search_query)) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bookmark Categories Seed
INSERT INTO bookmark_categories (slug, name, description, color, icon, sort_order) VALUES
  ('articles', 'Articles', 'Long-form articles and blog posts', 'blue', 'file-text', 0),
  ('tools', 'Tools', 'Software tools and utilities', 'purple', 'wrench', 1),
  ('repos', 'Repositories', 'GitHub repos and code libraries', 'gray', 'github', 2),
  ('videos', 'Videos', 'YouTube videos and tutorials', 'red', 'video', 3),
  ('threads', 'Threads', 'Twitter/X threads', 'sky', 'message-square', 4),
  ('papers', 'Papers', 'Research papers and whitepapers', 'green', 'scroll', 5),
  ('news', 'News', 'News articles and announcements', 'orange', 'newspaper', 6),
  ('reference', 'Reference', 'Documentation and references', 'yellow', 'book-open', 7),
  ('inspiration', 'Inspiration', 'Design and creative inspiration', 'pink', 'sparkles', 8),
  ('other', 'Other', 'Uncategorized bookmarks', 'slate', 'bookmark', 99)
ON CONFLICT (slug) DO NOTHING;

-- Bookmark Collections Seed
INSERT INTO bookmark_collections (name, slug, description, color, sort_order) VALUES
  ('Read Later', 'read-later', 'Articles and content to read later', 'blue', 0),
  ('Favorites', 'favorites', 'Best bookmarks worth revisiting', 'yellow', 1),
  ('AI & ML', 'ai-ml', 'Artificial intelligence and machine learning resources', 'purple', 2),
  ('Dev Tools', 'dev-tools', 'Development tools and utilities', 'green', 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PART 3: REALTIME (run separately if needed)
-- ============================================
-- Uncomment and run these to enable realtime:
-- ALTER PUBLICATION supabase_realtime ADD TABLE agent_commands;
-- ALTER PUBLICATION supabase_realtime ADD TABLE agent_responses;
-- ALTER PUBLICATION supabase_realtime ADD TABLE agent_confirmations;

-- Migration complete!
SELECT 'Migration 001_agent_and_bookmarks completed successfully' AS status;


-- ============================================
-- 5. METRICS (from 002_metrics.sql)
-- ============================================

-- Migration: Metrics Dashboard Infrastructure
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql must be applied first (provides is_admin() and update_updated_at_column())
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

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
DROP POLICY IF EXISTS "Admins can do everything with metrics_data" ON metrics_data;
CREATE POLICY "Admins can do everything with metrics_data" ON metrics_data FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with metrics_dashboards" ON metrics_dashboards FOR ALL USING (is_admin());
CREATE POLICY "Public can view public dashboards" ON metrics_dashboards FOR SELECT USING (is_public = true);
DROP POLICY IF EXISTS "Admins can do everything with metrics_alerts" ON metrics_alerts;
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


-- ============================================
-- 6. MARKETING (from 003_marketing.sql)
-- ============================================

-- Migration: Marketing & Email Infrastructure
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql must be applied first (provides is_admin() and update_updated_at_column())
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

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
DROP POLICY IF EXISTS "Admins can do everything with email_lists" ON email_lists;
CREATE POLICY "Admins can do everything with email_lists" ON email_lists FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with email_campaigns" ON email_campaigns FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with email_templates" ON email_templates FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Admins can view email_events" ON email_events;
CREATE POLICY "Admins can view email_events" ON email_events FOR SELECT USING (is_admin());
CREATE POLICY "Admins can do everything with nps_surveys" ON nps_surveys FOR ALL USING (is_admin());

-- Allow public to submit NPS responses for active surveys
DROP POLICY IF EXISTS "Public can respond to active surveys" ON nps_responses;
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

DROP POLICY IF EXISTS "Admins can view nps_responses" ON nps_responses;
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


-- ============================================
-- 7. NEWS TABLES (from news/001_initial.sql)
-- ============================================

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
  url TEXT NOT NULL, -- Primary link (external for link-blogs, article for regular blogs)
  source_url TEXT, -- The source's own article page (for link-blogs like Daring Fireball)
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
DROP POLICY IF EXISTS "Public can view news categories" ON news_categories;
CREATE POLICY "Public can view news categories" ON news_categories
  FOR SELECT USING (true);

-- Public read for active sources
DROP POLICY IF EXISTS "Public can view active news sources" ON news_sources;
CREATE POLICY "Public can view active news sources" ON news_sources
  FOR SELECT USING (is_active = true);

-- Public read for curated articles only
DROP POLICY IF EXISTS "Public can view curated articles" ON news_articles;
CREATE POLICY "Public can view curated articles" ON news_articles
  FOR SELECT USING (is_curated = true AND is_archived = false);

-- Filters are admin-only (no public policy)

-- Dashboard tabs are admin-only (no public policy)

-- Admin full access policies
DROP POLICY IF EXISTS "Admins can do everything with news_categories" ON news_categories;
CREATE POLICY "Admins can do everything with news_categories" ON news_categories
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with news_sources" ON news_sources;
CREATE POLICY "Admins can do everything with news_sources" ON news_sources
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with news_articles" ON news_articles;
CREATE POLICY "Admins can do everything with news_articles" ON news_articles
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with news_filters" ON news_filters;
CREATE POLICY "Admins can do everything with news_filters" ON news_filters
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything with news_dashboard_tabs" ON news_dashboard_tabs;
CREATE POLICY "Admins can do everything with news_dashboard_tabs" ON news_dashboard_tabs
  FOR ALL USING (is_admin());

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_news_categories_updated_at ON news_categories;
CREATE TRIGGER update_news_categories_updated_at
  BEFORE UPDATE ON news_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_sources_updated_at ON news_sources;
CREATE TRIGGER update_news_sources_updated_at
  BEFORE UPDATE ON news_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_articles_updated_at ON news_articles;
CREATE TRIGGER update_news_articles_updated_at
  BEFORE UPDATE ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_filters_updated_at ON news_filters;
CREATE TRIGGER update_news_filters_updated_at
  BEFORE UPDATE ON news_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_dashboard_tabs_updated_at ON news_dashboard_tabs;
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


-- ============================================
-- 8. GENERATIVE UI (from 005_generative_ui.sql)
-- ============================================

-- Generative UI Migration
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql and 004_multi_tenant.sql must be applied first
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

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


-- ============================================
-- 9. PROMPTS (from 006_prompts.sql)
-- ============================================

-- Prompts Migration
-- Prerequisites: schema.sql must be applied first (is_admin, update_updated_at_column)
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

-- ============================================
-- PROMPTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  model TEXT,
  variables JSONB DEFAULT '[]',
  is_template BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_prompts_slug ON prompts(slug);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_prompts_is_template ON prompts(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_prompts_is_favorite ON prompts(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_prompts_is_public ON prompts(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS prompts_updated_at ON prompts;
CREATE TRIGGER prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Public read for public prompts
DROP POLICY IF EXISTS prompts_public_read ON prompts;
CREATE POLICY prompts_public_read ON prompts
  FOR SELECT USING (is_public = true);

-- Admin full access
DROP POLICY IF EXISTS prompts_admin_all ON prompts;
CREATE POLICY prompts_admin_all ON prompts
  FOR ALL USING (is_admin());

-- ============================================
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Prompts migration completed successfully';
  RAISE NOTICE 'Table created: prompts';
END $$;


-- ============================================
-- 10. SITE BUILDER (from 20240601000001_site_builder.sql)
-- ============================================

-- Site Builder Migration
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql must be applied first (provides is_admin() and update_updated_at_column())
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

-- ============================================
-- SITE BUILDER TABLES
-- ============================================

-- Pages: Store page definitions
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

-- Page Versions: Track version history
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

-- Page Components: Store component instances on pages
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

-- Component Templates: Reusable component presets
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

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sb_pages_slug ON sb_pages(slug);
CREATE INDEX IF NOT EXISTS idx_sb_pages_status ON sb_pages(status);
CREATE INDEX IF NOT EXISTS idx_sb_pages_created_by ON sb_pages(created_by);

CREATE INDEX IF NOT EXISTS idx_sb_page_versions_page_id ON sb_page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_sb_page_versions_version ON sb_page_versions(page_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_sb_page_components_page_id ON sb_page_components(page_id);
CREATE INDEX IF NOT EXISTS idx_sb_page_components_order ON sb_page_components(page_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sb_page_components_parent ON sb_page_components(parent_id);

CREATE INDEX IF NOT EXISTS idx_sb_component_templates_type ON sb_component_templates(component_type);
CREATE INDEX IF NOT EXISTS idx_sb_component_templates_category ON sb_component_templates(category);
CREATE INDEX IF NOT EXISTS idx_sb_component_templates_active ON sb_component_templates(is_active);

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS set_sb_pages_updated_at ON sb_pages;
CREATE TRIGGER set_sb_pages_updated_at
  BEFORE UPDATE ON sb_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_sb_page_components_updated_at ON sb_page_components;
CREATE TRIGGER set_sb_page_components_updated_at
  BEFORE UPDATE ON sb_page_components
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_sb_component_templates_updated_at ON sb_component_templates;
CREATE TRIGGER set_sb_component_templates_updated_at
  BEFORE UPDATE ON sb_component_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE sb_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_page_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_component_templates ENABLE ROW LEVEL SECURITY;

-- Public read access to published pages
DROP POLICY IF EXISTS "Public read published pages" ON sb_pages;
CREATE POLICY "Public read published pages" ON sb_pages
  FOR SELECT USING (status = 'published');

-- Public read access to components of published pages
DROP POLICY IF EXISTS "Public read published page components" ON sb_page_components;
CREATE POLICY "Public read published page components" ON sb_page_components
  FOR SELECT USING (
    page_id IN (SELECT id FROM sb_pages WHERE status = 'published')
  );

-- Admin full access to pages
DROP POLICY IF EXISTS "Admin full access to pages" ON sb_pages;
CREATE POLICY "Admin full access to pages" ON sb_pages
  FOR ALL USING (is_admin());

-- Admin full access to page versions
DROP POLICY IF EXISTS "Admin full access to page versions" ON sb_page_versions;
CREATE POLICY "Admin full access to page versions" ON sb_page_versions
  FOR ALL USING (is_admin());

-- Admin full access to page components
DROP POLICY IF EXISTS "Admin full access to page components" ON sb_page_components;
CREATE POLICY "Admin full access to page components" ON sb_page_components
  FOR ALL USING (is_admin());

-- Admin full access to component templates
DROP POLICY IF EXISTS "Admin full access to component templates" ON sb_component_templates;
CREATE POLICY "Admin full access to component templates" ON sb_component_templates
  FOR ALL USING (is_admin());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create a new page version
CREATE OR REPLACE FUNCTION create_page_version(
  p_page_id UUID,
  p_created_by TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page_record RECORD;
  v_version_number INTEGER;
  v_version_id UUID;
  v_components JSONB;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create page versions';
  END IF;

  -- Get page details
  SELECT * INTO v_page_record FROM sb_pages WHERE id = p_page_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found';
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM sb_page_versions
  WHERE page_id = p_page_id;

  -- Get current components as JSON
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'component_type', component_type,
        'props', props,
        'order_index', order_index,
        'parent_id', parent_id
      )
      ORDER BY order_index
    ),
    '[]'::jsonb
  )
  INTO v_components
  FROM sb_page_components
  WHERE page_id = p_page_id;

  -- Create version
  INSERT INTO sb_page_versions (
    page_id,
    version_number,
    title,
    slug,
    description,
    components,
    created_by
  )
  VALUES (
    p_page_id,
    v_version_number,
    v_page_record.title,
    v_page_record.slug,
    v_page_record.description,
    v_components,
    p_created_by
  )
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$;

-- Function to restore a page version
CREATE OR REPLACE FUNCTION restore_page_version(
  p_version_id UUID,
  p_updated_by TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version_record RECORD;
  v_component JSONB;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can restore page versions';
  END IF;

  -- Get version details
  SELECT * INTO v_version_record FROM sb_page_versions WHERE id = p_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  -- Update page metadata
  UPDATE sb_pages
  SET
    title = v_version_record.title,
    slug = v_version_record.slug,
    description = v_version_record.description,
    updated_by = p_updated_by,
    updated_at = now()
  WHERE id = v_version_record.page_id;

  -- Delete current components
  DELETE FROM sb_page_components WHERE page_id = v_version_record.page_id;

  -- Restore components from version
  FOR v_component IN
    SELECT * FROM jsonb_array_elements(v_version_record.components)
  LOOP
    INSERT INTO sb_page_components (
      id,
      page_id,
      component_type,
      props,
      order_index,
      parent_id
    )
    VALUES (
      (v_component->>'id')::UUID,
      v_version_record.page_id,
      v_component->>'component_type',
      v_component->'props',
      (v_component->>'order_index')::INTEGER,
      CASE WHEN v_component->>'parent_id' IS NULL THEN NULL ELSE (v_component->>'parent_id')::UUID END
    );
  END LOOP;

  RETURN v_version_record.page_id;
END;
$$;

-- ============================================
-- SEED DATA (Optional)
-- ============================================

-- Insert default component templates
INSERT INTO sb_component_templates (name, description, component_type, category, props, is_active, created_by)
VALUES
  (
    'Hero - Centered',
    'Centered hero with headline, description, and CTA',
    'hero',
    'Heroes',
    '{"layout":"centered","headline":"Welcome to Our Site","subheadline":"Build amazing things with ease","ctaText":"Get Started","ctaLink":"#","backgroundImage":null,"backgroundOverlay":true}',
    true,
    'system'
  ),
  (
    'Features - Grid',
    '3-column feature grid',
    'features',
    'Features',
    '{"layout":"grid","columns":3,"items":[{"icon":"check","title":"Feature One","description":"Amazing feature description"},{"icon":"check","title":"Feature Two","description":"Another great feature"},{"icon":"check","title":"Feature Three","description":"One more feature"}]}',
    true,
    'system'
  ),
  (
    'CTA - Banner',
    'Full-width call-to-action banner',
    'cta',
    'CTAs',
    '{"headline":"Ready to get started?","description":"Join thousands of satisfied customers","buttonText":"Sign Up Now","buttonLink":"#","layout":"banner","backgroundColor":"primary"}',
    true,
    'system'
  ),
  (
    'Text - Rich Content',
    'Rich text content block',
    'text',
    'Content',
    '{"content":"<p>Add your rich text content here. Supports <strong>bold</strong>, <em>italic</em>, and more.</p>","alignment":"left","maxWidth":"prose"}',
    true,
    'system'
  )
ON CONFLICT DO NOTHING;


-- ============================================
-- 11. TASK SYSTEM (from 20240601000002_task_system.sql)
-- ============================================

-- Task System Migration
-- Run this in Supabase SQL Editor
-- Prerequisites: schema.sql must be applied first (provides is_admin() and update_updated_at_column())
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

-- ============================================
-- TASK CATEGORIES
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

-- ============================================
-- TASKS
-- ============================================

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

-- ============================================
-- TASK COMMENTS
-- ============================================

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

-- ============================================
-- TASK REMINDERS
-- ============================================

CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  reminder_at TIMESTAMPTZ NOT NULL,
  reminder_type TEXT DEFAULT 'email' CHECK (reminder_type IN ('email', 'notification', 'both')),
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_task_categories_slug ON task_categories(slug);
CREATE INDEX IF NOT EXISTS idx_task_categories_order ON task_categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_overdue ON tasks(is_overdue) WHERE is_overdue = true;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_author ON task_comments(author);
CREATE INDEX IF NOT EXISTS idx_task_comments_created ON task_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_reminders_task ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_at ON task_reminders(reminder_at);
CREATE INDEX IF NOT EXISTS idx_task_reminders_pending ON task_reminders(is_sent) WHERE is_sent = false;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- Drop policies first (idempotent)
DROP POLICY IF EXISTS "Admins can do everything with task_categories" ON task_categories;
DROP POLICY IF EXISTS "Admins can do everything with tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can do everything with task_comments" ON task_comments;
DROP POLICY IF EXISTS "Admins can do everything with task_reminders" ON task_reminders;

CREATE POLICY "Admins can do everything with task_categories" ON task_categories FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with tasks" ON tasks FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Admins can do everything with task_comments" ON task_comments;
CREATE POLICY "Admins can do everything with task_comments" ON task_comments FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with task_reminders" ON task_reminders FOR ALL USING (is_admin());

-- ============================================
-- TRIGGERS
-- ============================================

-- Drop triggers first (idempotent)
DROP TRIGGER IF EXISTS update_task_categories_updated_at ON task_categories;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
DROP TRIGGER IF EXISTS update_task_completed_at ON tasks;

CREATE TRIGGER update_task_categories_updated_at BEFORE UPDATE ON task_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update completed_at when task is marked as done
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

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get overdue tasks
CREATE OR REPLACE FUNCTION get_overdue_tasks()
RETURNS SETOF tasks AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM tasks
  WHERE is_overdue = true
  ORDER BY due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending reminders
CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE (
  reminder_id UUID,
  task_id UUID,
  task_title TEXT,
  reminder_at TIMESTAMPTZ,
  reminder_type TEXT,
  assigned_to TEXT,
  assigned_to_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.task_id,
    t.title,
    r.reminder_at,
    r.reminder_type,
    t.assigned_to,
    t.assigned_to_email
  FROM task_reminders r
  JOIN tasks t ON t.id = r.task_id
  WHERE r.is_sent = false
    AND r.reminder_at <= now()
  ORDER BY r.reminder_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark reminder as sent
CREATE OR REPLACE FUNCTION mark_reminder_sent(reminder_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE task_reminders
  SET is_sent = true, sent_at = now()
  WHERE id = reminder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO task_categories (slug, name, description, color, icon, sort_order) VALUES
  ('development', 'Development', 'Software development tasks', 'blue', 'code', 0),
  ('design', 'Design', 'UI/UX and graphic design tasks', 'purple', 'palette', 1),
  ('content', 'Content', 'Content creation and writing', 'green', 'file-text', 2),
  ('marketing', 'Marketing', 'Marketing and promotion tasks', 'orange', 'megaphone', 3),
  ('infrastructure', 'Infrastructure', 'DevOps and infrastructure', 'red', 'server', 4),
  ('research', 'Research', 'Research and investigation', 'yellow', 'search', 5),
  ('bug', 'Bug Fix', 'Bug fixes and issue resolution', 'rose', 'bug', 6),
  ('feature', 'Feature', 'New features and enhancements', 'sky', 'sparkles', 7),
  ('documentation', 'Documentation', 'Documentation and guides', 'slate', 'book-open', 8),
  ('meeting', 'Meeting', 'Meetings and calls', 'indigo', 'calendar', 9),
  ('other', 'Other', 'Other tasks', 'gray', 'circle', 99)
ON CONFLICT (slug) DO NOTHING;

-- Migration complete!
SELECT 'Migration 003_task_system completed successfully' AS status;


-- ============================================
-- 12. COMMAND CENTER (from 20240601000003_command_center.sql)
-- ============================================

-- Command Center Migration
-- Prerequisites: schema.sql must be applied first (is_admin, update_updated_at_column)
-- This migration is idempotent and safe to re-run
-- Tables: skills, infrastructure_nodes, configs, runbooks

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

-- ============================================
-- SKILLS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'skill',
  source TEXT,
  invocation TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  dependencies TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT skills_type_check CHECK (type IN ('skill', 'agent', 'mcp-server', 'script', 'automation')),
  CONSTRAINT skills_category_check CHECK (category IN ('development', 'deployment', 'testing', 'content', 'data', 'other')),
  CONSTRAINT skills_status_check CHECK (status IN ('active', 'inactive', 'draft'))
);

CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_skills_tags ON skills USING GIN(tags);

DROP TRIGGER IF EXISTS skills_updated_at ON skills;
CREATE TRIGGER skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skills_admin_all ON skills;
CREATE POLICY skills_admin_all ON skills
  FOR ALL USING (is_admin());

-- ============================================
-- INFRASTRUCTURE_NODES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS infrastructure_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'service',
  provider TEXT NOT NULL DEFAULT 'other',
  url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  tier TEXT,
  region TEXT,
  config_notes TEXT,
  environment TEXT NOT NULL DEFAULT 'production',
  connected_to UUID[] DEFAULT '{}',
  monthly_cost DECIMAL(10,2),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT infra_type_check CHECK (type IN ('service', 'server', 'database', 'cdn', 'dns', 'domain', 'repository', 'ci-cd', 'monitoring')),
  CONSTRAINT infra_provider_check CHECK (provider IN ('netlify', 'supabase', 'github', 'cloudflare', 'sentry', 'clerk', 'ghost', 'vercel', 'aws', 'other')),
  CONSTRAINT infra_status_check CHECK (status IN ('active', 'degraded', 'inactive')),
  CONSTRAINT infra_environment_check CHECK (environment IN ('production', 'staging', 'development'))
);

CREATE INDEX IF NOT EXISTS idx_infra_slug ON infrastructure_nodes(slug);
CREATE INDEX IF NOT EXISTS idx_infra_type ON infrastructure_nodes(type);
CREATE INDEX IF NOT EXISTS idx_infra_provider ON infrastructure_nodes(provider);
CREATE INDEX IF NOT EXISTS idx_infra_status ON infrastructure_nodes(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_infra_environment ON infrastructure_nodes(environment);
CREATE INDEX IF NOT EXISTS idx_infra_tags ON infrastructure_nodes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_infra_connected_to ON infrastructure_nodes USING GIN(connected_to);

DROP TRIGGER IF EXISTS infra_updated_at ON infrastructure_nodes;
CREATE TRIGGER infra_updated_at
  BEFORE UPDATE ON infrastructure_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE infrastructure_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS infra_admin_all ON infrastructure_nodes;
CREATE POLICY infra_admin_all ON infrastructure_nodes
  FOR ALL USING (is_admin());

-- ============================================
-- CONFIGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'file',
  source_path TEXT,
  content TEXT,
  format TEXT NOT NULL DEFAULT 'text',
  category TEXT NOT NULL DEFAULT 'other',
  version TEXT,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT configs_type_check CHECK (type IN ('file', 'snippet', 'setting', 'template')),
  CONSTRAINT configs_format_check CHECK (format IN ('json', 'yaml', 'toml', 'javascript', 'typescript', 'markdown', 'text', 'env')),
  CONSTRAINT configs_category_check CHECK (category IN ('build', 'lint', 'deploy', 'auth', 'database', 'styling', 'testing', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_configs_slug ON configs(slug);
CREATE INDEX IF NOT EXISTS idx_configs_type ON configs(type);
CREATE INDEX IF NOT EXISTS idx_configs_format ON configs(format);
CREATE INDEX IF NOT EXISTS idx_configs_category ON configs(category);
CREATE INDEX IF NOT EXISTS idx_configs_is_active ON configs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_configs_tags ON configs USING GIN(tags);

DROP TRIGGER IF EXISTS configs_updated_at ON configs;
CREATE TRIGGER configs_updated_at
  BEFORE UPDATE ON configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS configs_admin_all ON configs;
CREATE POLICY configs_admin_all ON configs
  FOR ALL USING (is_admin());

-- ============================================
-- RUNBOOKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS runbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  type TEXT NOT NULL DEFAULT 'runbook',
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'normal',
  related_skills UUID[] DEFAULT '{}',
  related_infra UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT runbooks_category_check CHECK (category IN ('deployment', 'troubleshooting', 'onboarding', 'security', 'maintenance', 'architecture', 'api', 'other')),
  CONSTRAINT runbooks_type_check CHECK (type IN ('runbook', 'guide', 'reference', 'decision-record')),
  CONSTRAINT runbooks_status_check CHECK (status IN ('current', 'outdated', 'draft')),
  CONSTRAINT runbooks_priority_check CHECK (priority IN ('critical', 'high', 'normal', 'low'))
);

CREATE INDEX IF NOT EXISTS idx_runbooks_slug ON runbooks(slug);
CREATE INDEX IF NOT EXISTS idx_runbooks_category ON runbooks(category);
CREATE INDEX IF NOT EXISTS idx_runbooks_type ON runbooks(type);
CREATE INDEX IF NOT EXISTS idx_runbooks_status ON runbooks(status) WHERE status = 'current';
CREATE INDEX IF NOT EXISTS idx_runbooks_priority ON runbooks(priority);
CREATE INDEX IF NOT EXISTS idx_runbooks_tags ON runbooks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_runbooks_related_skills ON runbooks USING GIN(related_skills);
CREATE INDEX IF NOT EXISTS idx_runbooks_related_infra ON runbooks USING GIN(related_infra);

DROP TRIGGER IF EXISTS runbooks_updated_at ON runbooks;
CREATE TRIGGER runbooks_updated_at
  BEFORE UPDATE ON runbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE runbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS runbooks_admin_all ON runbooks;
CREATE POLICY runbooks_admin_all ON runbooks
  FOR ALL USING (is_admin());

-- ============================================
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Command Center migration completed successfully';
  RAISE NOTICE 'Tables created: skills, infrastructure_nodes, configs, runbooks';
END $$;


-- ============================================
-- 13. AGENT PLATFORM (from 20240601000004_agent_platform.sql)
-- ============================================

-- Agent Platform Migration
-- Issues: #140 - agents table, #141 - API key functions, #142 - agent_id columns,
--          #143 - workflow tables, #144 - integrations/credentials, #145 - audit_log
-- Prerequisites: schema.sql must be applied first (is_admin, update_updated_at_column)
-- Requires: pgcrypto extension (for SHA-256 hashing)
-- This migration is idempotent and safe to re-run
-- Tables: agents
-- Functions: current_agent_id, generate_agent_api_key, verify_agent_api_key,
--            rotate_agent_api_key, revoke_agent_api_key

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

-- ============================================
-- HELPER FUNCTION: current_agent_id()
-- ============================================
-- Returns the UUID of the currently-authenticated agent from session context.
-- Returns NULL when no agent context is set (e.g. dashboard / human user).
-- Follows the current_tenant_id() pattern from 004_multi_tenant.sql.

CREATE OR REPLACE FUNCTION current_agent_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_agent_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- AGENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('autonomous', 'supervised', 'tool')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended')),
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  api_key_hash TEXT,
  api_key_prefix TEXT,
  health_status JSONB DEFAULT '{"status": "unknown"}'::jsonb,
  rate_limit_rpm INTEGER NOT NULL DEFAULT 60,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agents_api_key_hash ON agents(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status) WHERE status = 'active';

-- ============================================
-- RLS + POLICIES
-- ============================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with agents" ON agents;
CREATE POLICY "Admins can do everything with agents" ON agents
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Agents can read their own row" ON agents;
CREATE POLICY "Agents can read their own row" ON agents
  FOR SELECT USING (id = current_agent_id());

-- ============================================
-- TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PGCRYPTO EXTENSION (for SHA-256 hashing)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- API KEY MANAGEMENT FUNCTIONS (#141)
-- ============================================

-- Generate a new API key for an agent.
-- Key format: mj_agent_<32 random hex chars> (42 chars total)
-- Stores SHA-256 hash + prefix; returns plaintext key (only time it's visible).
CREATE OR REPLACE FUNCTION generate_agent_api_key(p_agent_id UUID)
RETURNS TEXT AS $$
DECLARE
  raw_key TEXT;
  full_key TEXT;
  key_hash TEXT;
  key_prefix TEXT;
BEGIN
  -- Generate 32 random hex chars
  raw_key := encode(gen_random_bytes(16), 'hex');
  full_key := 'mj_agent_' || raw_key;
  key_prefix := 'mj_agent_' || substring(raw_key from 1 for 8) || '...';
  key_hash := encode(digest(full_key, 'sha256'), 'hex');

  UPDATE agents
  SET api_key_hash = key_hash,
      api_key_prefix = key_prefix,
      updated_at = now()
  WHERE id = p_agent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found: %', p_agent_id;
  END IF;

  RETURN full_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify an API key and return the agent row if valid and active.
-- Returns NULL if key is invalid or agent is not active.
CREATE OR REPLACE FUNCTION verify_agent_api_key(p_api_key TEXT)
RETURNS SETOF agents AS $$
DECLARE
  key_hash TEXT;
BEGIN
  key_hash := encode(digest(p_api_key, 'sha256'), 'hex');

  RETURN QUERY
  SELECT *
  FROM agents
  WHERE agents.api_key_hash = key_hash
    AND agents.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant anon role execute on verify so edge functions can authenticate agents.
GRANT EXECUTE ON FUNCTION verify_agent_api_key(TEXT) TO anon;

-- Rotate an agent's API key: generates a new key, invalidating the old one.
-- Logs the rotation to audit_log if that table exists.
-- Returns the new plaintext key.
CREATE OR REPLACE FUNCTION rotate_agent_api_key(p_agent_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_key TEXT;
BEGIN
  -- generate_agent_api_key overwrites the hash, effectively invalidating the old key
  new_key := generate_agent_api_key(p_agent_id);

  -- Log rotation if audit_log table exists (created by #145)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    EXECUTE format(
      'INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details) VALUES (%L, %L, %L, %L, %L, %L)',
      'system', p_agent_id, 'api_key_rotated', 'agent', p_agent_id, '{"action": "rotate"}'::jsonb
    );
  END IF;

  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke an agent's API key by clearing the hash and prefix.
-- Logs the revocation to audit_log if that table exists.
-- Returns true on success.
CREATE OR REPLACE FUNCTION revoke_agent_api_key(p_agent_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE agents
  SET api_key_hash = NULL,
      api_key_prefix = NULL,
      updated_at = now()
  WHERE id = p_agent_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Log revocation if audit_log table exists (created by #145)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    EXECUTE format(
      'INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details) VALUES (%L, %L, %L, %L, %L, %L)',
      'system', p_agent_id, 'api_key_revoked', 'agent', p_agent_id, '{"action": "revoke"}'::jsonb
    );
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADD agent_id TO EXISTING AGENT TABLES (#142)
-- ============================================
-- Existing rows keep agent_id = NULL (single-agent era).
-- New rows from authenticated agents will have agent_id set by edge functions.

ALTER TABLE agent_commands ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE agent_responses ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE agent_task_runs ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_commands_agent_id ON agent_commands(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_responses_agent_id ON agent_responses(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_id ON agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_task_runs_agent_id ON agent_task_runs(agent_id);

-- Agent-scoped RLS policies: agents can only access rows belonging to them.
-- Dashboard (admin) users retain full access via existing is_admin() policies.

DROP POLICY IF EXISTS "Agents can access their own commands" ON agent_commands;
CREATE POLICY "Agents can access their own commands" ON agent_commands
  FOR ALL USING (agent_id = current_agent_id());

DROP POLICY IF EXISTS "Agents can access their own responses" ON agent_responses;
CREATE POLICY "Agents can access their own responses" ON agent_responses
  FOR ALL USING (agent_id = current_agent_id());

DROP POLICY IF EXISTS "Agents can access their own tasks" ON agent_tasks;
CREATE POLICY "Agents can access their own tasks" ON agent_tasks
  FOR ALL USING (agent_id = current_agent_id());

DROP POLICY IF EXISTS "Agents can read their own task runs" ON agent_task_runs;
CREATE POLICY "Agents can read their own task runs" ON agent_task_runs
  FOR SELECT USING (agent_id = current_agent_id());

-- ============================================
-- WORKFLOWS TABLE (#143)
-- ============================================
-- Workflow definitions with step-based execution plans.
-- Note: created_by uses TEXT (Clerk user ID) to match existing agent table patterns.

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'event')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with workflows" ON workflows;
CREATE POLICY "Admins can do everything with workflows" ON workflows
  FOR ALL USING (is_admin());

-- ============================================
-- WORKFLOW_RUNS TABLE (#143)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  trigger_type TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}'::jsonb,
  step_results JSONB DEFAULT '[]'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_history ON workflow_runs(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status) WHERE status IN ('pending', 'running');

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with workflow_runs" ON workflow_runs;
CREATE POLICY "Admins can do everything with workflow_runs" ON workflow_runs
  FOR ALL USING (is_admin());

-- ============================================
-- INTEGRATIONS TABLE (#144)
-- ============================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,
  service_type TEXT NOT NULL CHECK (service_type IN ('oauth2', 'api_key', 'webhook', 'custom')),
  display_name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  health_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrations_service_name ON integrations(service_name);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status) WHERE status = 'active';

DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with integrations" ON integrations;
CREATE POLICY "Admins can do everything with integrations" ON integrations
  FOR ALL USING (is_admin());

-- ============================================
-- INTEGRATION_CREDENTIALS TABLE (#144)
-- ============================================
-- encrypted_data is AES-256-GCM encrypted JSON, decrypted only server-side in edge functions.
-- NEVER returned to agents via RLS — agents have no direct policy on this table.

CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('oauth2_token', 'api_key', 'service_account', 'custom')),
  encrypted_data TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_credentials_lookup ON integration_credentials(integration_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_expiry ON integration_credentials(expires_at) WHERE expires_at IS NOT NULL;

DROP TRIGGER IF EXISTS update_integration_credentials_updated_at ON integration_credentials;
CREATE TRIGGER update_integration_credentials_updated_at
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

-- Admin-only: credentials are never exposed to agents directly.
-- Edge functions use service_role key which bypasses RLS.
DROP POLICY IF EXISTS "Admins can do everything with integration_credentials" ON integration_credentials;
CREATE POLICY "Admins can do everything with integration_credentials" ON integration_credentials
  FOR ALL USING (is_admin());

-- ============================================
-- AGENT_INTEGRATIONS JUNCTION TABLE (#144)
-- ============================================
-- Maps which agents have access to which integrations.
-- granted_by uses TEXT (Clerk user ID) to match existing patterns.

CREATE TABLE IF NOT EXISTS agent_integrations (
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  granted_scopes TEXT[] DEFAULT '{}',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by TEXT,
  PRIMARY KEY (agent_id, integration_id)
);

ALTER TABLE agent_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with agent_integrations" ON agent_integrations;
CREATE POLICY "Admins can do everything with agent_integrations" ON agent_integrations
  FOR ALL USING (is_admin());

-- Agents can see which integrations they've been granted.
DROP POLICY IF EXISTS "Agents can view their own integrations" ON agent_integrations;
CREATE POLICY "Agents can view their own integrations" ON agent_integrations
  FOR SELECT USING (agent_id = current_agent_id());

-- Agents can view integration details for their granted integrations.
DROP POLICY IF EXISTS "Agents can view granted integrations" ON integrations;
CREATE POLICY "Agents can view granted integrations" ON integrations
  FOR SELECT USING (
    id IN (SELECT integration_id FROM agent_integrations WHERE agent_id = current_agent_id())
  );

-- ============================================
-- AUDIT_LOG TABLE (#145)
-- ============================================
-- Partitioned by month for query performance.
-- Agents CANNOT read or write this table directly.

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system', 'scheduler')),
  actor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  correlation_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions for current and next 3 months
CREATE TABLE IF NOT EXISTS audit_log_2026_02 PARTITION OF audit_log
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_03 PARTITION OF audit_log
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_04 PARTITION OF audit_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_05 PARTITION OF audit_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX IF NOT EXISTS idx_audit_log_action_ts ON audit_log (action, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_ts ON audit_log (actor_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_correlation ON audit_log (correlation_id) WHERE correlation_id IS NOT NULL;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with audit_log" ON audit_log;
CREATE POLICY "Admins can do everything with audit_log" ON audit_log
  FOR ALL USING (is_admin());

-- ============================================
-- AUDIT HELPER FUNCTION (#145)
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_actor_type TEXT,
  p_actor_id TEXT,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_correlation_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details, correlation_id)
  VALUES (p_actor_type, p_actor_id, p_action, p_resource_type, p_resource_id, p_details, p_correlation_id)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUDIT AUTO-LOGGING TRIGGERS (#145)
-- ============================================

-- Generic audit trigger function for INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  audit_action TEXT;
  resource_id_val TEXT;
  detail_json JSONB;
BEGIN
  audit_action := TG_TABLE_NAME || '.' || lower(TG_OP);

  IF TG_OP = 'DELETE' THEN
    resource_id_val := OLD.id::TEXT;
    detail_json := jsonb_build_object('operation', TG_OP);
  ELSIF TG_OP = 'INSERT' THEN
    resource_id_val := NEW.id::TEXT;
    detail_json := jsonb_build_object('operation', TG_OP);
  ELSE -- UPDATE
    resource_id_val := NEW.id::TEXT;
    detail_json := jsonb_build_object('operation', TG_OP);
  END IF;

  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
  VALUES (
    CASE WHEN current_agent_id() IS NOT NULL THEN 'agent' ELSE 'user' END,
    COALESCE(current_agent_id()::TEXT, current_setting('request.jwt.claims', true)::jsonb->>'sub'),
    audit_action,
    TG_TABLE_NAME,
    resource_id_val,
    detail_json
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit triggers to key tables
DROP TRIGGER IF EXISTS audit_agents ON agents;
CREATE TRIGGER audit_agents
  AFTER INSERT OR UPDATE OR DELETE ON agents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_workflows ON workflows;
CREATE TRIGGER audit_workflows
  AFTER INSERT OR UPDATE OR DELETE ON workflows
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_workflow_runs ON workflow_runs;
CREATE TRIGGER audit_workflow_runs
  AFTER INSERT OR UPDATE ON workflow_runs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_integration_credentials ON integration_credentials;
CREATE TRIGGER audit_integration_credentials
  AFTER INSERT OR UPDATE OR DELETE ON integration_credentials
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_agent_commands ON agent_commands;
CREATE TRIGGER audit_agent_commands
  AFTER INSERT ON agent_commands
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================
-- AUTO-CREATE FUTURE PARTITIONS (#145)
-- ============================================
-- Call monthly via pg_cron or manually to create next month's partition.

CREATE OR REPLACE FUNCTION create_audit_log_partition()
RETURNS VOID AS $$
DECLARE
  next_month DATE;
  partition_name TEXT;
  start_date TEXT;
  end_date TEXT;
BEGIN
  next_month := date_trunc('month', now() + interval '1 month');
  partition_name := 'audit_log_' || to_char(next_month, 'YYYY_MM');
  start_date := to_char(next_month, 'YYYY-MM-DD');
  end_date := to_char(next_month + interval '1 month', 'YYYY-MM-DD');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Agent Platform migration completed successfully';
  RAISE NOTICE 'Tables created: agents, workflows, workflow_runs, integrations, integration_credentials, agent_integrations, audit_log (partitioned)';
  RAISE NOTICE 'Columns added: agent_id on agent_commands, agent_responses, agent_tasks, agent_task_runs';
  RAISE NOTICE 'Functions created: current_agent_id(), generate/verify/rotate/revoke_agent_api_key(), log_audit_event(), audit_trigger_func(), create_audit_log_partition()';
END $$;


-- ============================================
-- 14. SCHEDULER (from 20240601000005_scheduler.sql)
-- ============================================

-- Scheduler Migration: pg_cron + pg_net for workflow scheduling
-- Issue: #148
-- Prerequisites: 20240601000004_agent_platform.sql (workflows, workflow_runs, audit_log)
-- Requires: pg_cron, pg_net extensions (available on Supabase hosted instances)
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verify extensions were actually created (they may be unavailable on some Postgres instances)
-- (prerequisite check removed - consolidated migration)

-- ============================================
-- SCHEDULED_WORKFLOW_RUNS TRACKING TABLE
-- ============================================
-- Tracks dispatched scheduled runs to prevent duplicate dispatch per minute.

CREATE TABLE IF NOT EXISTS scheduled_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  dispatched_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'failed')),
  response_status INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_workflow_runs_dedup
  ON scheduled_workflow_runs(workflow_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_workflow_runs_status
  ON scheduled_workflow_runs(status) WHERE status = 'pending';

ALTER TABLE scheduled_workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with scheduled_workflow_runs" ON scheduled_workflow_runs;
CREATE POLICY "Admins can do everything with scheduled_workflow_runs" ON scheduled_workflow_runs
  FOR ALL USING (is_admin());

-- ============================================
-- CRON FIELD MATCHER
-- ============================================
-- Matches a single cron field value against the current value.
-- Supports: * (any), exact number, ranges (1-5), lists (1,3,5), steps (*/5, 1-10/2)

CREATE OR REPLACE FUNCTION cron_field_matches(field_expr TEXT, current_val INTEGER, min_val INTEGER, max_val INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  part TEXT;
  parts TEXT[];
  range_parts TEXT[];
  step_parts TEXT[];
  range_start INTEGER;
  range_end INTEGER;
  step_val INTEGER;
  i INTEGER;
BEGIN
  -- Wildcard matches everything
  IF field_expr = '*' THEN
    RETURN true;
  END IF;

  -- Split by comma for lists (e.g., "1,3,5")
  parts := string_to_array(field_expr, ',');

  FOR i IN 1..array_length(parts, 1) LOOP
    part := trim(parts[i]);

    -- Check for step values (e.g., "*/5" or "1-10/2")
    IF position('/' IN part) > 0 THEN
      step_parts := string_to_array(part, '/');
      step_val := step_parts[2]::INTEGER;

      IF step_parts[1] = '*' THEN
        range_start := min_val;
        range_end := max_val;
      ELSIF position('-' IN step_parts[1]) > 0 THEN
        range_parts := string_to_array(step_parts[1], '-');
        range_start := range_parts[1]::INTEGER;
        range_end := range_parts[2]::INTEGER;
      ELSE
        range_start := step_parts[1]::INTEGER;
        range_end := max_val;
      END IF;

      IF current_val >= range_start AND current_val <= range_end
         AND (current_val - range_start) % step_val = 0 THEN
        RETURN true;
      END IF;

    -- Check for ranges (e.g., "1-5")
    ELSIF position('-' IN part) > 0 THEN
      range_parts := string_to_array(part, '-');
      range_start := range_parts[1]::INTEGER;
      range_end := range_parts[2]::INTEGER;

      IF current_val >= range_start AND current_val <= range_end THEN
        RETURN true;
      END IF;

    -- Exact match
    ELSE
      IF current_val = part::INTEGER THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;

  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5-FIELD CRON EXPRESSION EVALUATOR
-- ============================================
-- Evaluates "minute hour day_of_month month day_of_week" against current time.

CREATE OR REPLACE FUNCTION cron_matches_now(cron_expression TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  fields TEXT[];
  now_ts TIMESTAMPTZ;
  curr_minute INTEGER;
  curr_hour INTEGER;
  curr_dom INTEGER;
  curr_month INTEGER;
  curr_dow INTEGER;
BEGIN
  fields := string_to_array(trim(cron_expression), ' ');

  IF array_length(fields, 1) != 5 THEN
    RAISE WARNING 'Invalid cron expression (expected 5 fields): %', cron_expression;
    RETURN false;
  END IF;

  now_ts := date_trunc('minute', now());
  curr_minute := extract(minute FROM now_ts)::INTEGER;
  curr_hour := extract(hour FROM now_ts)::INTEGER;
  curr_dom := extract(day FROM now_ts)::INTEGER;
  curr_month := extract(month FROM now_ts)::INTEGER;
  -- PostgreSQL: 0=Sunday, 6=Saturday (matches standard cron)
  curr_dow := extract(dow FROM now_ts)::INTEGER;

  RETURN cron_field_matches(fields[1], curr_minute, 0, 59)
     AND cron_field_matches(fields[2], curr_hour, 0, 23)
     AND cron_field_matches(fields[3], curr_dom, 1, 31)
     AND cron_field_matches(fields[4], curr_month, 1, 12)
     AND cron_field_matches(fields[5], curr_dow, 0, 6);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- CHECK DUE WORKFLOWS (main scheduler loop)
-- ============================================
-- Called every minute by pg_cron. Finds active scheduled workflows whose cron
-- expression matches now, prevents duplicate dispatch for the same minute,
-- and dispatches via pg_net HTTP POST to the workflow-executor edge function.

CREATE OR REPLACE FUNCTION check_due_workflows()
RETURNS void AS $$
DECLARE
  wf RECORD;
  this_minute TIMESTAMPTZ;
  supabase_url TEXT;
  scheduler_secret TEXT;
  dispatch_url TEXT;
  already_dispatched BOOLEAN;
  request_id BIGINT;
BEGIN
  this_minute := date_trunc('minute', now());
  supabase_url := current_setting('app.supabase_url', true);
  scheduler_secret := current_setting('app.scheduler_secret', true);

  -- If not configured, log warning and exit
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING 'app.supabase_url not set — skipping workflow dispatch';
    RETURN;
  END IF;

  IF scheduler_secret IS NULL OR scheduler_secret = '' THEN
    RAISE WARNING 'app.scheduler_secret not set — skipping workflow dispatch';
    RETURN;
  END IF;

  dispatch_url := supabase_url || '/functions/v1/workflow-executor';

  FOR wf IN
    SELECT id, name, trigger_config
    FROM workflows
    WHERE is_active = true
      AND trigger_type = 'scheduled'
      AND trigger_config->>'cron' IS NOT NULL
      AND cron_matches_now(trigger_config->>'cron')
  LOOP
    -- Prevent duplicate dispatch for same workflow + minute
    SELECT EXISTS(
      SELECT 1
      FROM scheduled_workflow_runs
      WHERE workflow_id = wf.id
        AND scheduled_at = this_minute
    ) INTO already_dispatched;

    IF already_dispatched THEN
      CONTINUE;
    END IF;

    -- Record the scheduled run
    INSERT INTO scheduled_workflow_runs (workflow_id, scheduled_at, status)
    VALUES (wf.id, this_minute, 'pending');

    -- Dispatch via pg_net
    BEGIN
      SELECT net.http_post(
        url := dispatch_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-scheduler-secret', scheduler_secret
        ),
        body := jsonb_build_object(
          'workflow_id', wf.id,
          'trigger_type', 'scheduled',
          'trigger_data', jsonb_build_object(
            'scheduled_at', this_minute,
            'cron', wf.trigger_config->>'cron'
          )
        )
      ) INTO request_id;

      -- Mark as dispatched
      UPDATE scheduled_workflow_runs
      SET status = 'dispatched',
          dispatched_at = now()
      WHERE workflow_id = wf.id
        AND scheduled_at = this_minute;

      -- Audit log
      INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
      VALUES (
        'scheduler', NULL, 'workflow.dispatched', 'workflow', wf.id::TEXT,
        jsonb_build_object(
          'workflow_name', wf.name,
          'scheduled_at', this_minute,
          'cron', wf.trigger_config->>'cron',
          'pg_net_request_id', request_id
        )
      );

    EXCEPTION WHEN OTHERS THEN
      -- Mark as failed
      UPDATE scheduled_workflow_runs
      SET status = 'failed',
          error = SQLERRM
      WHERE workflow_id = wf.id
        AND scheduled_at = this_minute;

      RAISE WARNING 'Failed to dispatch workflow %: %', wf.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CLEANUP OLD SCHEDULED RUNS
-- ============================================
-- Purge records older than 30 days to prevent table bloat.

CREATE OR REPLACE FUNCTION cleanup_old_scheduled_runs()
RETURNS void AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM scheduled_workflow_runs
  WHERE created_at < now() - interval '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    INSERT INTO audit_log (actor_type, action, resource_type, details)
    VALUES (
      'system', 'scheduled_runs.cleanup', 'scheduled_workflow_runs',
      jsonb_build_object('deleted_count', deleted_count)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CRON JOB SCHEDULES
-- ============================================

-- Check for due workflows every minute
SELECT cron.schedule(
  'check-due-workflows',
  '* * * * *',
  $$SELECT check_due_workflows()$$
);

-- Cleanup old scheduled run records every Sunday at 3 AM UTC
SELECT cron.schedule(
  'cleanup-scheduled-runs',
  '0 3 * * 0',
  $$SELECT cleanup_old_scheduled_runs()$$
);

-- Create next month's audit_log partition on the 25th of each month
SELECT cron.schedule(
  'create-audit-log-partition',
  '0 0 25 * *',
  $$SELECT create_audit_log_partition()$$
);

-- ============================================
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Scheduler migration completed successfully';
  RAISE NOTICE 'Table created: scheduled_workflow_runs';
  RAISE NOTICE 'Functions created: cron_field_matches(), cron_matches_now(), check_due_workflows(), cleanup_old_scheduled_runs()';
  RAISE NOTICE 'Cron jobs scheduled: check-due-workflows (every minute), cleanup-scheduled-runs (Sundays 3AM), create-audit-log-partition (25th monthly)';
END $$;


-- ============================================
-- 15. PHASE 4 (from 20240601000006_phase4.sql)
-- ============================================

-- Phase 4 Migration: Advanced Features
-- Issues: #156, #157, #158, #159, #160, #161, #162
-- Prerequisites: 20240601000005_scheduler.sql (scheduled_workflow_runs, pg_cron, pg_net)
-- This migration adds: capability definitions, agent skills, signing secrets,
-- event bus (types, subscriptions, events), seed data, integration health check cron job

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

-- ============================================
-- A: CAPABILITY DEFINITIONS TABLE (#162)
-- ============================================

CREATE TABLE IF NOT EXISTS capability_definitions (
  name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capability_definitions_category ON capability_definitions(category);

ALTER TABLE capability_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read capability definitions" ON capability_definitions;
CREATE POLICY "Anyone can read capability definitions" ON capability_definitions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage capability definitions" ON capability_definitions;
CREATE POLICY "Admins can manage capability definitions" ON capability_definitions
  FOR ALL USING (is_admin());

-- ============================================
-- B: SEED CAPABILITY DEFINITIONS (#162)
-- ============================================

INSERT INTO capability_definitions (name, display_name, description, category) VALUES
  ('crm', 'CRM', 'Contact and relationship management operations', 'data'),
  ('kb', 'Knowledge Base', 'Knowledge base search and management', 'data'),
  ('video', 'Video Processing', 'Video transcoding, analysis, and management', 'media'),
  ('meta_analysis', 'Meta-Analysis', 'Cross-domain data analysis and pattern recognition', 'analytics'),
  ('email', 'Email', 'Email sending, receiving, and management', 'communication'),
  ('calendar', 'Calendar', 'Calendar event scheduling and management', 'productivity'),
  ('tasks', 'Task Management', 'Task creation, assignment, and tracking', 'productivity'),
  ('documents', 'Documents', 'Document creation, editing, and storage', 'productivity'),
  ('research', 'Research', 'Web research, data gathering, and summarization', 'analytics'),
  ('code', 'Code Operations', 'Code generation, review, and deployment', 'engineering'),
  ('data', 'Data Processing', 'Data transformation, ETL, and pipeline operations', 'data'),
  ('social', 'Social Media', 'Social media posting and engagement', 'communication'),
  ('finance', 'Finance', 'Financial data, invoicing, and payment operations', 'data'),
  ('automation', 'Automation', 'Workflow automation and integration orchestration', 'system')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- C: AGENT SKILLS JUNCTION TABLE (#160)
-- ============================================

CREATE TABLE IF NOT EXISTS agent_skills (
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  capability_name TEXT NOT NULL REFERENCES capability_definitions(name) ON DELETE CASCADE,
  proficiency INTEGER NOT NULL DEFAULT 50 CHECK (proficiency BETWEEN 0 AND 100),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by TEXT,
  PRIMARY KEY (agent_id, capability_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_skills_capability ON agent_skills(capability_name);
CREATE INDEX IF NOT EXISTS idx_agent_skills_proficiency ON agent_skills(capability_name, proficiency DESC);

ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage agent skills" ON agent_skills;
CREATE POLICY "Admins can manage agent skills" ON agent_skills
  FOR ALL USING (is_admin());

-- Function: Get all skills for an agent
CREATE OR REPLACE FUNCTION get_agent_skills(p_agent_id UUID)
RETURNS TABLE (
  capability_name TEXT,
  display_name TEXT,
  description TEXT,
  category TEXT,
  proficiency INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cd.name,
    cd.display_name,
    cd.description,
    cd.category,
    ags.proficiency
  FROM agent_skills ags
  JOIN capability_definitions cd ON cd.name = ags.capability_name
  WHERE ags.agent_id = p_agent_id
  ORDER BY ags.proficiency DESC, cd.display_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Get all agents with a specific skill
CREATE OR REPLACE FUNCTION get_skill_agents(p_capability_name TEXT)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  agent_type TEXT,
  agent_status TEXT,
  proficiency INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.type::TEXT,
    a.status::TEXT,
    ags.proficiency
  FROM agent_skills ags
  JOIN agents a ON a.id = ags.agent_id
  WHERE ags.capability_name = p_capability_name
    AND a.status = 'active'
  ORDER BY ags.proficiency DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Get the best agent for a given skill
CREATE OR REPLACE FUNCTION get_best_agent_for_skill(p_capability_name TEXT)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  proficiency INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    ags.proficiency
  FROM agent_skills ags
  JOIN agents a ON a.id = ags.agent_id
  WHERE ags.capability_name = p_capability_name
    AND a.status = 'active'
  ORDER BY ags.proficiency DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Check if an agent can perform a specific skill
CREATE OR REPLACE FUNCTION can_agent_perform_skill(p_agent_id UUID, p_capability_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM agent_skills ags
    JOIN agents a ON a.id = ags.agent_id
    WHERE ags.agent_id = p_agent_id
      AND ags.capability_name = p_capability_name
      AND a.status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Trigger: sync agent_skills changes to agents.capabilities array
CREATE OR REPLACE FUNCTION sync_agent_capabilities()
RETURNS TRIGGER AS $$
DECLARE
  target_agent_id UUID;
BEGIN
  -- Determine which agent_id was affected
  IF TG_OP = 'DELETE' THEN
    target_agent_id := OLD.agent_id;
  ELSE
    target_agent_id := NEW.agent_id;
  END IF;

  -- Rebuild the capabilities array from agent_skills
  UPDATE agents
  SET capabilities = (
    SELECT COALESCE(array_agg(capability_name ORDER BY capability_name), '{}')
    FROM agent_skills
    WHERE agent_id = target_agent_id
  ),
  updated_at = now()
  WHERE id = target_agent_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_agent_capabilities ON agent_skills;
CREATE TRIGGER trg_sync_agent_capabilities
  AFTER INSERT OR UPDATE OR DELETE ON agent_skills
  FOR EACH ROW
  EXECUTE FUNCTION sync_agent_capabilities();

-- ============================================
-- D: SIGNING SECRET ON AGENTS (#159)
-- ============================================

-- Add encrypted signing secret column to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS signing_secret_encrypted JSONB;

-- Function: Generate a new signing secret for an agent
CREATE OR REPLACE FUNCTION generate_signing_secret(p_agent_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_secret TEXT;
BEGIN
  -- Generate a 32-byte hex secret prefixed with mj_sign_
  new_secret := 'mj_sign_' || encode(gen_random_bytes(32), 'hex');

  -- Store the secret encrypted (encryption happens at the edge function layer)
  -- Here we store a placeholder that the edge function will replace with the encrypted version
  UPDATE agents
  SET signing_secret_encrypted = jsonb_build_object(
    'pending_plaintext', new_secret,
    'generated_at', now()::TEXT
  ),
  updated_at = now()
  WHERE id = p_agent_id;

  -- Audit log
  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
  VALUES (
    'system', NULL, 'agent.signing_secret.generated', 'agent', p_agent_id::TEXT,
    jsonb_build_object('prefix', substring(new_secret from 1 for 16) || '...')
  );

  RETURN new_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Rotate signing secret (generate new, invalidate old)
CREATE OR REPLACE FUNCTION rotate_signing_secret(p_agent_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_secret TEXT;
BEGIN
  -- Audit the rotation
  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
  VALUES (
    'system', NULL, 'agent.signing_secret.rotated', 'agent', p_agent_id::TEXT,
    jsonb_build_object('rotated_at', now()::TEXT)
  );

  -- Generate new secret (reuses generate_signing_secret logic)
  new_secret := 'mj_sign_' || encode(gen_random_bytes(32), 'hex');

  UPDATE agents
  SET signing_secret_encrypted = jsonb_build_object(
    'pending_plaintext', new_secret,
    'generated_at', now()::TEXT
  ),
  updated_at = now()
  WHERE id = p_agent_id;

  RETURN new_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Revoke signing secret
CREATE OR REPLACE FUNCTION revoke_signing_secret(p_agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agents
  SET signing_secret_encrypted = NULL,
      updated_at = now()
  WHERE id = p_agent_id;

  -- Audit log
  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
  VALUES (
    'system', NULL, 'agent.signing_secret.revoked', 'agent', p_agent_id::TEXT,
    jsonb_build_object('revoked_at', now()::TEXT)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- E: EVENT BUS TABLES (#161)
-- ============================================

-- Event Types (registry of all event types in the system)
CREATE TABLE IF NOT EXISTS event_types (
  name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'system',
  schema JSONB,
  is_built_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_types_category ON event_types(category);

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read event types" ON event_types;
CREATE POLICY "Anyone can read event types" ON event_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage event types" ON event_types;
CREATE POLICY "Admins can manage event types" ON event_types
  FOR ALL USING (is_admin());

-- Event Subscriptions (who listens to what events)
CREATE TABLE IF NOT EXISTS event_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL REFERENCES event_types(name) ON DELETE CASCADE,
  subscriber_type TEXT NOT NULL CHECK (subscriber_type IN ('workflow', 'agent', 'webhook')),
  subscriber_id TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_subscriptions_event_type ON event_subscriptions(event_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_event_subscriptions_subscriber ON event_subscriptions(subscriber_type, subscriber_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_subscriptions_unique
  ON event_subscriptions(event_type, subscriber_type, subscriber_id);

ALTER TABLE event_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage event subscriptions" ON event_subscriptions;
CREATE POLICY "Admins can manage event subscriptions" ON event_subscriptions
  FOR ALL USING (is_admin());

-- Events (log of emitted events)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL REFERENCES event_types(name),
  payload JSONB NOT NULL DEFAULT '{}',
  source_type TEXT NOT NULL CHECK (source_type IN ('agent', 'workflow', 'system', 'webhook', 'user')),
  source_id TEXT,
  correlation_id TEXT,
  dispatched_to JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_correlation ON events(correlation_id) WHERE correlation_id IS NOT NULL;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read events" ON events;
CREATE POLICY "Admins can read events" ON events
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "System can insert events" ON events;
CREATE POLICY "System can insert events" ON events
  FOR INSERT WITH CHECK (true);

-- Function: Emit an event and dispatch to subscribers
CREATE OR REPLACE FUNCTION emit_event(
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}',
  p_source_type TEXT DEFAULT 'system',
  p_source_id TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
  sub RECORD;
  dispatch_targets JSONB := '[]'::JSONB;
  supabase_url TEXT;
  scheduler_secret TEXT;
BEGIN
  -- Validate event type exists
  IF NOT EXISTS (SELECT 1 FROM event_types WHERE name = p_event_type) THEN
    RAISE EXCEPTION 'Unknown event type: %', p_event_type;
  END IF;

  -- Insert the event
  INSERT INTO events (event_type, payload, source_type, source_id, correlation_id)
  VALUES (p_event_type, p_payload, p_source_type, p_source_id, p_correlation_id)
  RETURNING id INTO event_id;

  -- Get config for HTTP dispatch
  supabase_url := current_setting('app.supabase_url', true);
  scheduler_secret := current_setting('app.scheduler_secret', true);

  -- Dispatch to active subscribers
  FOR sub IN
    SELECT id, subscriber_type, subscriber_id, config
    FROM event_subscriptions
    WHERE event_type = p_event_type
      AND is_active = true
  LOOP
    dispatch_targets := dispatch_targets || jsonb_build_object(
      'subscription_id', sub.id,
      'subscriber_type', sub.subscriber_type,
      'subscriber_id', sub.subscriber_id
    );

    -- Dispatch based on subscriber type
    CASE sub.subscriber_type
      WHEN 'workflow' THEN
        -- Dispatch to workflow-executor via pg_net
        IF supabase_url IS NOT NULL AND supabase_url != '' AND scheduler_secret IS NOT NULL THEN
          PERFORM net.http_post(
            url := supabase_url || '/functions/v1/workflow-executor',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-scheduler-secret', scheduler_secret
            ),
            body := jsonb_build_object(
              'workflow_id', sub.subscriber_id,
              'trigger_type', 'event',
              'trigger_data', jsonb_build_object(
                'event_id', event_id,
                'event_type', p_event_type,
                'payload', p_payload
              )
            )
          );
        END IF;

      WHEN 'webhook' THEN
        -- Dispatch to webhook URL via pg_net
        IF sub.config ? 'url' THEN
          PERFORM net.http_post(
            url := sub.config->>'url',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'X-Event-Type', p_event_type,
              'X-Event-Id', event_id::TEXT
            ),
            body := jsonb_build_object(
              'event_id', event_id,
              'event_type', p_event_type,
              'payload', p_payload,
              'timestamp', now()::TEXT
            )
          );
        END IF;

      WHEN 'agent' THEN
        -- For agent subscribers, insert directly into events table for polling
        -- (agents query events table filtered by their subscriptions)
        NULL; -- No additional action needed; the event record is already created

      ELSE
        RAISE WARNING 'Unknown subscriber type: %', sub.subscriber_type;
    END CASE;
  END LOOP;

  -- Update the event with dispatch targets
  UPDATE events
  SET dispatched_to = dispatch_targets
  WHERE id = event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit trigger for events table
CREATE OR REPLACE FUNCTION audit_event_emission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, details)
  VALUES (
    NEW.source_type,
    NEW.source_id,
    'event.emitted',
    'event',
    NEW.id::TEXT,
    jsonb_build_object(
      'event_type', NEW.event_type,
      'correlation_id', NEW.correlation_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_event_emission ON events;
CREATE TRIGGER trg_audit_event_emission
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION audit_event_emission();

-- ============================================
-- F: SEED EVENT TYPES (#161)
-- ============================================

INSERT INTO event_types (name, display_name, description, category, is_built_in) VALUES
  ('contact.created', 'Contact Created', 'Fired when a new contact is created', 'crm', true),
  ('contact.updated', 'Contact Updated', 'Fired when a contact is updated', 'crm', true),
  ('contact.deleted', 'Contact Deleted', 'Fired when a contact is deleted', 'crm', true),
  ('task.created', 'Task Created', 'Fired when a new task is created', 'tasks', true),
  ('task.completed', 'Task Completed', 'Fired when a task is completed', 'tasks', true),
  ('task.overdue', 'Task Overdue', 'Fired when a task becomes overdue', 'tasks', true),
  ('workflow.started', 'Workflow Started', 'Fired when a workflow run begins', 'workflows', true),
  ('workflow.completed', 'Workflow Completed', 'Fired when a workflow run completes', 'workflows', true),
  ('workflow.failed', 'Workflow Failed', 'Fired when a workflow run fails', 'workflows', true),
  ('agent.registered', 'Agent Registered', 'Fired when a new agent is registered', 'agents', true),
  ('agent.status_changed', 'Agent Status Changed', 'Fired when an agent status changes', 'agents', true),
  ('agent.error', 'Agent Error', 'Fired when an agent encounters an error', 'agents', true),
  ('integration.connected', 'Integration Connected', 'Fired when an integration is connected', 'integrations', true),
  ('integration.disconnected', 'Integration Disconnected', 'Fired when an integration is disconnected', 'integrations', true),
  ('integration.error', 'Integration Error', 'Fired when an integration encounters an error', 'integrations', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- G: SEED AGENTS (#162)
-- ============================================

-- Seed 3 default agents with deterministic UUIDs for referencing
INSERT INTO agents (id, name, type, status, capabilities, rate_limit_rpm, metadata)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'OpenClaw',
    'autonomous',
    'active',
    ARRAY['crm', 'email', 'tasks', 'research', 'automation'],
    120,
    '{"description": "Autonomous agent for CRM, email, and task automation", "version": "1.0"}'::JSONB
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Dashboard',
    'tool',
    'active',
    ARRAY['data', 'meta_analysis', 'documents'],
    300,
    '{"description": "Tool agent for dashboard data queries and document generation", "version": "1.0"}'::JSONB
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Scheduler',
    'tool',
    'active',
    ARRAY['calendar', 'tasks', 'automation'],
    60,
    '{"description": "Tool agent for scheduling and calendar operations", "version": "1.0"}'::JSONB
  )
ON CONFLICT (id) DO NOTHING;

-- Generate API keys for seeded agents (only if they don't already have one)
DO $$
DECLARE
  agent_rec RECORD;
BEGIN
  FOR agent_rec IN
    SELECT id FROM agents
    WHERE id IN (
      'a0000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000002',
      'a0000000-0000-0000-0000-000000000003'
    )
    AND api_key_hash IS NULL
  LOOP
    PERFORM generate_agent_api_key(agent_rec.id);
  END LOOP;
END $$;

-- Seed agent_skills for the 3 default agents
INSERT INTO agent_skills (agent_id, capability_name, proficiency, granted_by) VALUES
  -- OpenClaw: strong in CRM, email, tasks, research, automation
  ('a0000000-0000-0000-0000-000000000001', 'crm', 90, 'system'),
  ('a0000000-0000-0000-0000-000000000001', 'email', 85, 'system'),
  ('a0000000-0000-0000-0000-000000000001', 'tasks', 80, 'system'),
  ('a0000000-0000-0000-0000-000000000001', 'research', 75, 'system'),
  ('a0000000-0000-0000-0000-000000000001', 'automation', 85, 'system'),
  -- Dashboard: strong in data, meta_analysis, documents
  ('a0000000-0000-0000-0000-000000000002', 'data', 95, 'system'),
  ('a0000000-0000-0000-0000-000000000002', 'meta_analysis', 90, 'system'),
  ('a0000000-0000-0000-0000-000000000002', 'documents', 80, 'system'),
  -- Scheduler: strong in calendar, tasks, automation
  ('a0000000-0000-0000-0000-000000000003', 'calendar', 95, 'system'),
  ('a0000000-0000-0000-0000-000000000003', 'tasks', 85, 'system'),
  ('a0000000-0000-0000-0000-000000000003', 'automation', 70, 'system')
ON CONFLICT (agent_id, capability_name) DO NOTHING;

-- ============================================
-- H: INTEGRATION HEALTH CHECK CRON JOB (#157)
-- ============================================

-- Add health_check_url and health_checked_at columns to integrations
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS health_check_url TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS health_checked_at TIMESTAMPTZ;

-- pg_cron job to call integration-health edge function hourly
SELECT cron.schedule(
  'integration-health-check',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/integration-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-scheduler-secret', current_setting('app.scheduler_secret', true)
    ),
    body := '{}'::jsonb
  )
  $$
);

-- ============================================
-- AUDIT TRIGGERS FOR NEW TABLES
-- ============================================

-- Audit trigger for capability_definitions
CREATE OR REPLACE FUNCTION audit_capability_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (actor_type, action, resource_type, resource_id, details)
    VALUES ('system', 'capability.' || lower(TG_OP), 'capability_definition', OLD.name,
            jsonb_build_object('display_name', OLD.display_name));
    RETURN OLD;
  ELSE
    INSERT INTO audit_log (actor_type, action, resource_type, resource_id, details)
    VALUES ('system', 'capability.' || lower(TG_OP), 'capability_definition', NEW.name,
            jsonb_build_object('display_name', NEW.display_name, 'category', NEW.category));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_capability_change ON capability_definitions;
CREATE TRIGGER trg_audit_capability_change
  AFTER INSERT OR UPDATE OR DELETE ON capability_definitions
  FOR EACH ROW
  EXECUTE FUNCTION audit_capability_change();

-- Audit trigger for event_subscriptions
CREATE OR REPLACE FUNCTION audit_event_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (actor_type, action, resource_type, resource_id, details)
    VALUES ('system', 'event_subscription.' || lower(TG_OP), 'event_subscription', OLD.id::TEXT,
            jsonb_build_object('event_type', OLD.event_type, 'subscriber_type', OLD.subscriber_type));
    RETURN OLD;
  ELSE
    INSERT INTO audit_log (actor_type, action, resource_type, resource_id, details)
    VALUES ('system', 'event_subscription.' || lower(TG_OP), 'event_subscription', NEW.id::TEXT,
            jsonb_build_object('event_type', NEW.event_type, 'subscriber_type', NEW.subscriber_type, 'is_active', NEW.is_active));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_event_subscription_change ON event_subscriptions;
CREATE TRIGGER trg_audit_event_subscription_change
  AFTER INSERT OR UPDATE OR DELETE ON event_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION audit_event_subscription_change();

-- ============================================
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 4 migration completed successfully';
  RAISE NOTICE 'Tables created: capability_definitions, agent_skills, event_types, event_subscriptions, events';
  RAISE NOTICE 'Columns added: agents.signing_secret_encrypted, integrations.health_check_url, integrations.health_checked_at';
  RAISE NOTICE 'Functions created: get_agent_skills(), get_skill_agents(), get_best_agent_for_skill(), can_agent_perform_skill(), emit_event()';
  RAISE NOTICE 'Functions created: generate_signing_secret(), rotate_signing_secret(), revoke_signing_secret()';
  RAISE NOTICE 'Cron jobs scheduled: integration-health-check (hourly)';
  RAISE NOTICE 'Seed data: 14 capabilities, 15 event types, 3 agents (OpenClaw, Dashboard, Scheduler)';
END $$;


-- ============================================
-- 16. RATE LIMIT BUCKETS (from 20240601000007_rate_limit_buckets.sql)
-- ============================================

-- Migration: Persistent Rate Limit Buckets
-- Issue: #181 - In-memory rate limiting resets on every cold start
--
-- Creates a table and atomic RPC for persistent rate limiting that survives
-- edge function cold starts. Uses advisory locks for concurrency safety.

-- Rate limit buckets table
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_window_start
  ON rate_limit_buckets (window_start);

-- Atomic check-and-increment rate limit function
-- Returns: allowed (boolean), remaining (integer), reset_at (timestamptz), retry_after_seconds (integer)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_window_ms INTEGER DEFAULT 60000,
  p_max_requests INTEGER DEFAULT 100
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window_interval INTERVAL := (p_window_ms || ' milliseconds')::INTERVAL;
  v_entry RECORD;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Upsert: insert or update the bucket atomically
  INSERT INTO rate_limit_buckets (key, count, window_start, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      -- Window expired: reset to 1
      WHEN rate_limit_buckets.window_start + (p_window_ms || ' milliseconds')::INTERVAL <= v_now
        THEN 1
      -- Window active: increment
      ELSE rate_limit_buckets.count + 1
    END,
    window_start = CASE
      -- Window expired: reset window
      WHEN rate_limit_buckets.window_start + (p_window_ms || ' milliseconds')::INTERVAL <= v_now
        THEN v_now
      -- Window active: keep existing
      ELSE rate_limit_buckets.window_start
    END,
    updated_at = v_now
  RETURNING * INTO v_entry;

  v_reset_at := v_entry.window_start + v_window_interval;

  IF v_entry.count > p_max_requests THEN
    -- Over limit: roll back the increment
    UPDATE rate_limit_buckets SET count = count - 1 WHERE rate_limit_buckets.key = p_key;
    RETURN QUERY SELECT
      FALSE,
      0,
      v_reset_at,
      GREATEST(1, EXTRACT(EPOCH FROM (v_reset_at - v_now))::INTEGER);
  ELSE
    RETURN QUERY SELECT
      TRUE,
      p_max_requests - v_entry.count,
      v_reset_at,
      NULL::INTEGER;
  END IF;
END;
$$;

-- Cleanup function to remove expired buckets (call periodically or via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_buckets(p_max_age_ms INTEGER DEFAULT 300000)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limit_buckets
  WHERE window_start < NOW() - (p_max_age_ms || ' milliseconds')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- RLS: Only service role can access rate limit buckets
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- No policies = only service role key can access (which is what edge functions use)


-- ============================================
-- 17. WORKFLOW CONNECTORS (from 20240601000008 - RLS FIXED)
-- ============================================

-- Migration: Workflow Connectors
-- Adds integration_actions and step_templates tables for the workflow overhaul.
-- integration_actions defines per-integration actions (e.g., Slack "send_message").
-- step_templates provides reusable pre-built step configurations.

-- Prerequisite check: integrations table must exist
-- (prerequisite check removed - consolidated migration)

-- ============================================
-- INTEGRATION ACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS integration_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  parameter_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_auth BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(integration_id, action_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_actions_integration_id
  ON integration_actions (integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_actions_category
  ON integration_actions (category);
CREATE INDEX IF NOT EXISTS idx_integration_actions_active
  ON integration_actions (is_active) WHERE is_active = true;

-- updated_at trigger
CREATE OR REPLACE TRIGGER set_integration_actions_updated_at
  BEFORE UPDATE ON integration_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE integration_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access" ON integration_actions";
CREATE POLICY "Admin full access on integration_actions"
  ON integration_actions FOR ALL
  USING (is_admin());

CREATE POLICY "Agents can read active integration_actions"
  ON integration_actions FOR SELECT
  USING (is_active = true);

-- ============================================
-- STEP TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS step_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  step_type TEXT NOT NULL CHECK (step_type IN ('agent_command', 'wait', 'condition', 'integration_action')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  retries INTEGER NOT NULL DEFAULT 0,
  on_failure TEXT NOT NULL DEFAULT 'stop' CHECK (on_failure IN ('continue', 'stop', 'skip')),
  integration_action_id UUID REFERENCES integration_actions(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_step_templates_category
  ON step_templates (category);
CREATE INDEX IF NOT EXISTS idx_step_templates_step_type
  ON step_templates (step_type);
CREATE INDEX IF NOT EXISTS idx_step_templates_integration_action_id
  ON step_templates (integration_action_id) WHERE integration_action_id IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE TRIGGER set_step_templates_updated_at
  BEFORE UPDATE ON step_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE step_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access" ON step_templates";
CREATE POLICY "Admin full access on step_templates"
  ON step_templates FOR ALL
  USING (is_admin());

CREATE POLICY "Authenticated users can read active step_templates"
  ON step_templates FOR SELECT
  USING (is_active = true);


-- ============================================
-- 18. DESKTOP OS (from 20240601000009_desktop_os.sql)
-- ============================================

-- Desktop OS Migration — Virtual Filesystem + Workspaces
-- Issue: #196 Phase 3 — File Explorer + Virtual Filesystem
-- Prerequisites: schema.sql (is_admin, update_updated_at_column)
-- This migration is idempotent and safe to re-run

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
-- (prerequisite check removed - consolidated migration)

-- ============================================
-- DESKTOP FILESYSTEM TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS desktop_filesystem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES desktop_filesystem(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('folder', 'file', 'shortcut', 'alias')),
  target_type TEXT,
  target_id TEXT,
  icon TEXT,
  color TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  position JSONB,
  owner_id TEXT,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  is_trashed BOOLEAN NOT NULL DEFAULT false,
  trashed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: no duplicate names in the same folder for the same owner
-- Using a partial unique index to handle NULL parent_id (root level)
CREATE UNIQUE INDEX IF NOT EXISTS idx_desktop_fs_unique_name
  ON desktop_filesystem (parent_id, name, owner_id)
  WHERE parent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_desktop_fs_unique_name_root
  ON desktop_filesystem (name, owner_id)
  WHERE parent_id IS NULL;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_desktop_fs_parent_id ON desktop_filesystem(parent_id);
CREATE INDEX IF NOT EXISTS idx_desktop_fs_owner_id ON desktop_filesystem(owner_id);
CREATE INDEX IF NOT EXISTS idx_desktop_fs_type ON desktop_filesystem(type);
CREATE INDEX IF NOT EXISTS idx_desktop_fs_target ON desktop_filesystem(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_desktop_fs_trashed ON desktop_filesystem(is_trashed) WHERE is_trashed = true;

-- ============================================
-- RLS + POLICIES
-- ============================================

ALTER TABLE desktop_filesystem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with desktop_filesystem" ON desktop_filesystem;
CREATE POLICY "Admins can do everything with desktop_filesystem" ON desktop_filesystem
  FOR ALL USING (is_admin());

-- ============================================
-- TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS set_desktop_filesystem_updated_at ON desktop_filesystem;
CREATE TRIGGER set_desktop_filesystem_updated_at
  BEFORE UPDATE ON desktop_filesystem
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DESKTOP WORKSPACES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS desktop_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id TEXT,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  wallpaper TEXT,
  dock_items JSONB DEFAULT '[]'::jsonb,
  desktop_layout JSONB DEFAULT '[]'::jsonb,
  window_states JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_desktop_workspaces_owner_id ON desktop_workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_desktop_workspaces_owner_active ON desktop_workspaces(owner_id, is_active)
  WHERE is_active = true;

-- ============================================
-- RLS + POLICIES
-- ============================================

ALTER TABLE desktop_workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with desktop_workspaces" ON desktop_workspaces;
CREATE POLICY "Admins can do everything with desktop_workspaces" ON desktop_workspaces
  FOR ALL USING (is_admin());

-- ============================================
-- TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS set_desktop_workspaces_updated_at ON desktop_workspaces;
CREATE TRIGGER set_desktop_workspaces_updated_at
  BEFORE UPDATE ON desktop_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED ROOT FOLDERS (idempotent)
-- ============================================

INSERT INTO desktop_filesystem (id, parent_id, name, type, icon, owner_id)
VALUES
  ('10000000-0000-0000-0000-000000000001', NULL, 'Desktop', 'folder', 'Monitor', NULL),
  ('10000000-0000-0000-0000-000000000002', NULL, 'Applications', 'folder', 'AppWindow', NULL),
  ('10000000-0000-0000-0000-000000000003', NULL, 'Documents', 'folder', 'FileText', NULL),
  ('10000000-0000-0000-0000-000000000004', NULL, 'Downloads', 'folder', 'Download', NULL),
  ('10000000-0000-0000-0000-000000000005', NULL, 'Trash', 'folder', 'Trash2', NULL)
ON CONFLICT DO NOTHING;


-- ============================================
-- 19. DESKTOP FS RECURSIVE OPS (from 20240601000010)
-- ============================================

-- Migration: Recursive Filesystem Operations
-- Issues: #205 (recursive trash cascade), #206 (owner-scoped empty trash)
--
-- Adds RPC functions for recursive trash/restore and owner-scoped empty trash
-- to prevent orphaned rows and cross-tenant data leaks.

-- ============================================
-- RECURSIVE TRASH: cascade is_trashed to all descendants
-- ============================================

CREATE OR REPLACE FUNCTION trash_node_recursive(p_node_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_affected INTEGER;
BEGIN
  WITH RECURSIVE descendants AS (
    SELECT id FROM desktop_filesystem WHERE id = p_node_id
    UNION ALL
    SELECT f.id FROM desktop_filesystem f
    JOIN descendants d ON f.parent_id = d.id
  )
  UPDATE desktop_filesystem
  SET is_trashed = true, trashed_at = NOW()
  WHERE id IN (SELECT id FROM descendants);

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$$;

-- ============================================
-- RECURSIVE RESTORE: cascade is_trashed = false to all descendants
-- ============================================

CREATE OR REPLACE FUNCTION restore_node_recursive(p_node_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_affected INTEGER;
BEGIN
  WITH RECURSIVE descendants AS (
    SELECT id FROM desktop_filesystem WHERE id = p_node_id
    UNION ALL
    SELECT f.id FROM desktop_filesystem f
    JOIN descendants d ON f.parent_id = d.id
  )
  UPDATE desktop_filesystem
  SET is_trashed = false, trashed_at = NULL
  WHERE id IN (SELECT id FROM descendants);

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$$;

-- ============================================
-- OWNER-SCOPED EMPTY TRASH: only delete items belonging to a specific owner
-- ============================================

CREATE OR REPLACE FUNCTION empty_trash_for_owner(p_owner_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM desktop_filesystem
  WHERE is_trashed = true
    AND owner_id = p_owner_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


-- ============================================
-- 20. GET NODE PATH (from 20240601000011)
-- ============================================

-- Migration: Recursive node path lookup
-- Issue: #245 — getNodePath makes N sequential Supabase calls
--
-- Replaces client-side parent chain walking with a single recursive CTE RPC.

CREATE OR REPLACE FUNCTION get_node_path(p_node_id UUID)
RETURNS SETOF desktop_filesystem
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE path AS (
    SELECT * FROM desktop_filesystem WHERE id = p_node_id
    UNION ALL
    SELECT f.* FROM desktop_filesystem f
    JOIN path p ON f.id = p.parent_id
  )
  SELECT * FROM path ORDER BY created_at;
$$;


-- ============================================
-- 21. APP SCHEMA + TENANTS (from 20240601000011a_ensure_app_schema.sql)
-- ============================================

-- =====================================================================
-- REPAIR MIGRATION: Ensure app schema prerequisites exist
--
-- The app schema, tenants table, and helper functions were defined in
-- 004_multi_tenant.sql which is recorded as applied but was never
-- executed against the remote database.  This idempotent migration
-- creates the missing objects so that subsequent migrations
-- (20240601000012_fix_tenant_security, 20260217000001_provision_tenant_rpc)
-- can reference them.
--
-- Every statement uses IF NOT EXISTS / CREATE OR REPLACE so this is
-- safe to run even if the objects already exist.
-- =====================================================================
-- (BEGIN removed - single migration)
-- Enable ltree extension (Supabase has it available but schema may need it)
CREATE EXTENSION IF NOT EXISTS ltree;

-- 1. Create app schema
CREATE SCHEMA IF NOT EXISTS app;

-- 2. Create default_tenant_id() helper
CREATE OR REPLACE FUNCTION app.default_tenant_id()
RETURNS UUID AS $$
  SELECT '00000000-0000-0000-0000-000000000001'::UUID;
$$ LANGUAGE SQL IMMUTABLE;

-- 3. Create tenants table
CREATE TABLE IF NOT EXISTS app.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'account'
    CHECK (type IN ('platform', 'organization', 'account', 'user')),
  hierarchy_path ltree,
  parent_id UUID REFERENCES app.tenants(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_hierarchy ON app.tenants USING GIST (hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON app.tenants(parent_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON app.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_type ON app.tenants(type);

-- 5. Insert default tenant
INSERT INTO app.tenants (id, name, slug, type, hierarchy_path, is_active)
VALUES (
  app.default_tenant_id(),
  'Default Tenant',
  'default',
  'account',
  'default'::ltree,
  true
)
ON CONFLICT (id) DO NOTHING;

-- 6. RLS helper: current_tenant_id()
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.tenant_id', true), '')::UUID,
    app.default_tenant_id()
  );
$$ LANGUAGE SQL STABLE;

-- 7. RLS helper: can_access_tenant()
CREATE OR REPLACE FUNCTION app.can_access_tenant(target_hierarchy ltree)
RETURNS BOOLEAN AS $$
DECLARE
  current_hierarchy ltree;
BEGIN
  SELECT hierarchy_path INTO current_hierarchy
  FROM app.tenants
  WHERE id = app.current_tenant_id();

  IF current_hierarchy IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN target_hierarchy <@ current_hierarchy OR target_hierarchy = current_hierarchy;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 8. Context helpers
CREATE OR REPLACE FUNCTION app.set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app.clear_tenant_context()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Enable RLS on tenants (idempotent)
ALTER TABLE app.tenants ENABLE ROW LEVEL SECURITY;

-- 10. Tenants table policies
-- (prerequisite check removed - consolidated migration)
-- (COMMIT removed - single migration)

-- ============================================
-- 22. TENANT SECURITY FIX (from 20240601000012_fix_tenant_security.sql)
-- ============================================

-- =====================================================================
-- MIGRATION: Fix Multi-Tenant Security
-- Issues: #293 - RLS OR is_admin() bypass allows cross-tenant data leaks
--         #294 - admin_users table has no tenant_id
--         #296 - Add tenant_id claim to current_tenant_id() from JWT
--
-- This migration:
-- 1. Adds tenant_id to admin_users and scopes is_admin() per-tenant
-- 2. Updates current_tenant_id() to read tenant_id from JWT claims
-- 3. Removes the OR is_admin() bypass from ALL RLS policies
-- =====================================================================
-- (BEGIN removed - single migration)
-- ============================================
-- PART 1: Add tenant_id to admin_users (#294)
-- ============================================

-- Add tenant_id column to admin_users
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT app.default_tenant_id()
  REFERENCES app.tenants(id);

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_tenant ON admin_users(tenant_id);

-- Replace the UNIQUE constraint on email with a composite unique on (email, tenant_id)
-- so the same email can be admin of multiple tenants
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_email_key;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_email_tenant_unique UNIQUE (email, tenant_id);

-- ============================================
-- PART 2: Update is_admin() to be tenant-scoped (#294)
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
      AND tenant_id = app.current_tenant_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: Update current_tenant_id() to read JWT claim (#296)
-- ============================================

-- The Clerk JWT template should include tenant_id:
-- {
--   "email": "{{user.primary_email_address}}",
--   "tenant_id": "{{org.public_metadata.tenant_id}}"
-- }
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    -- 1. JWT claim (most reliable, set by Clerk JWT template)
    NULLIF(auth.jwt() ->> 'tenant_id', '')::UUID,
    -- 2. Session variable (set by app.set_tenant_context() RPC)
    NULLIF(current_setting('app.tenant_id', true), '')::UUID,
    -- 3. Fallback to default tenant
    app.default_tenant_id()
  );
$$ LANGUAGE SQL STABLE;

-- ============================================
-- PART 4: Fix RLS policies - remove OR is_admin() bypass (#293)
-- ============================================
-- The bug: `is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin())`
-- The OR is_admin() short-circuits the tenant check entirely.
-- Fix: `is_admin() AND tenant_id = app.current_tenant_id()`

-- Schema.sql tables
DROP POLICY IF EXISTS "Admins can do everything with apps" ON apps;
CREATE POLICY "Admins can do everything with apps" ON apps
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with app_suites" ON app_suites;
CREATE POLICY "Admins can do everything with app_suites" ON app_suites
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with blog_posts" ON blog_posts;
CREATE POLICY "Admins can do everything with blog_posts" ON blog_posts
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with projects" ON projects;
CREATE POLICY "Admins can do everything with projects" ON projects
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with site_content" ON site_content;
CREATE POLICY "Admins can do everything with site_content" ON site_content
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with contact_links" ON contact_links;
CREATE POLICY "Admins can do everything with contact_links" ON contact_links
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with work_history" ON work_history;
CREATE POLICY "Admins can do everything with work_history" ON work_history
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with case_studies" ON case_studies;
CREATE POLICY "Admins can do everything with case_studies" ON case_studies
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with timelines" ON timelines;
CREATE POLICY "Admins can do everything with timelines" ON timelines
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with timeline_entries" ON timeline_entries;
CREATE POLICY "Admins can do everything with timeline_entries" ON timeline_entries
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

-- News tables
DROP POLICY IF EXISTS "Admins can do everything with news_categories" ON news_categories;
CREATE POLICY "Admins can do everything with news_categories" ON news_categories
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with news_sources" ON news_sources;
CREATE POLICY "Admins can do everything with news_sources" ON news_sources
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with news_articles" ON news_articles;
CREATE POLICY "Admins can do everything with news_articles" ON news_articles
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with news_filters" ON news_filters;
CREATE POLICY "Admins can do everything with news_filters" ON news_filters
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with news_dashboard_tabs" ON news_dashboard_tabs;
CREATE POLICY "Admins can do everything with news_dashboard_tabs" ON news_dashboard_tabs
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

-- Agent tables
DROP POLICY IF EXISTS "Admins can do everything with agent_commands" ON agent_commands;
CREATE POLICY "Admins can do everything with agent_commands" ON agent_commands
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with agent_responses" ON agent_responses;
CREATE POLICY "Admins can do everything with agent_responses" ON agent_responses
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with agent_tasks" ON agent_tasks;
CREATE POLICY "Admins can do everything with agent_tasks" ON agent_tasks
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can view agent_task_runs" ON agent_task_runs;
CREATE POLICY "Admins can view agent_task_runs" ON agent_task_runs
  FOR SELECT USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with agent_sessions" ON agent_sessions;
CREATE POLICY "Admins can do everything with agent_sessions" ON agent_sessions
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with agent_confirmations" ON agent_confirmations;
CREATE POLICY "Admins can do everything with agent_confirmations" ON agent_confirmations
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

-- Bookmark tables
DROP POLICY IF EXISTS "Admins can do everything with bookmarks" ON bookmarks;
CREATE POLICY "Admins can do everything with bookmarks" ON bookmarks
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with bookmark_collections" ON bookmark_collections;
CREATE POLICY "Admins can do everything with bookmark_collections" ON bookmark_collections
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with bookmark_import_jobs" ON bookmark_import_jobs;
CREATE POLICY "Admins can do everything with bookmark_import_jobs" ON bookmark_import_jobs
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with bookmark_categories" ON bookmark_categories;
CREATE POLICY "Admins can do everything with bookmark_categories" ON bookmark_categories
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

-- Marketing tables
DROP POLICY IF EXISTS "Admins can do everything with email_subscribers" ON email_subscribers;
CREATE POLICY "Admins can do everything with email_subscribers" ON email_subscribers
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with email_lists" ON email_lists;
CREATE POLICY "Admins can do everything with email_lists" ON email_lists
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with email_campaigns" ON email_campaigns;
CREATE POLICY "Admins can do everything with email_campaigns" ON email_campaigns
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with email_templates" ON email_templates;
CREATE POLICY "Admins can do everything with email_templates" ON email_templates
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can view email_events" ON email_events;
CREATE POLICY "Admins can view email_events" ON email_events
  FOR SELECT USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with nps_surveys" ON nps_surveys;
CREATE POLICY "Admins can do everything with nps_surveys" ON nps_surveys
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can view nps_responses" ON nps_responses;
CREATE POLICY "Admins can view nps_responses" ON nps_responses
  FOR SELECT USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with content_suggestions" ON content_suggestions;
CREATE POLICY "Admins can do everything with content_suggestions" ON content_suggestions
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

-- Site builder tables
DROP POLICY IF EXISTS "Admin full access to pages" ON sb_pages;
CREATE POLICY "Admin full access to pages" ON sb_pages
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admin full access to page versions" ON sb_page_versions;
CREATE POLICY "Admin full access to page versions" ON sb_page_versions
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admin full access to page components" ON sb_page_components;
CREATE POLICY "Admin full access to page components" ON sb_page_components
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admin full access to component templates" ON sb_component_templates;
CREATE POLICY "Admin full access to component templates" ON sb_component_templates
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

-- Task system tables
DROP POLICY IF EXISTS "Admins can do everything with task_categories" ON task_categories;
CREATE POLICY "Admins can do everything with task_categories" ON task_categories
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with tasks" ON tasks;
CREATE POLICY "Admins can do everything with tasks" ON tasks
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with task_comments" ON task_comments;
CREATE POLICY "Admins can do everything with task_comments" ON task_comments
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

DROP POLICY IF EXISTS "Admins can do everything with task_reminders" ON task_reminders;
CREATE POLICY "Admins can do everything with task_reminders" ON task_reminders
  FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());

-- CRM tables (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    DROP POLICY IF EXISTS "Admins can do everything with contacts" ON contacts;
    CREATE POLICY "Admins can do everything with contacts" ON contacts
      FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactions') THEN
    DROP POLICY IF EXISTS "Admins can do everything with interactions" ON interactions;
    CREATE POLICY "Admins can do everything with interactions" ON interactions
      FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_ups') THEN
    DROP POLICY IF EXISTS "Admins can do everything with follow_ups" ON follow_ups;
    CREATE POLICY "Admins can do everything with follow_ups" ON follow_ups
      FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_lists') THEN
    DROP POLICY IF EXISTS "Admins can do everything with contact_lists" ON contact_lists;
    CREATE POLICY "Admins can do everything with contact_lists" ON contact_lists
      FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipelines') THEN
    DROP POLICY IF EXISTS "Admins can do everything with pipelines" ON pipelines;
    CREATE POLICY "Admins can do everything with pipelines" ON pipelines
      FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipeline_stages') THEN
    DROP POLICY IF EXISTS "Admins can do everything with pipeline_stages" ON pipeline_stages;
    CREATE POLICY "Admins can do everything with pipeline_stages" ON pipeline_stages
      FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') THEN
    DROP POLICY IF EXISTS "Admins can do everything with deals" ON deals;
    CREATE POLICY "Admins can do everything with deals" ON deals
      FOR ALL USING (is_admin() AND tenant_id = app.current_tenant_id());
  END IF;
END $$;

-- ============================================
-- PART 5: Update admin_users RLS to be tenant-scoped
-- ============================================

DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;
CREATE POLICY "Admins can view admin_users" ON admin_users
  FOR SELECT USING (is_admin() AND tenant_id = app.current_tenant_id());

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- (COMMIT removed - single migration)

-- =====================================================================
-- FOUNDATION MIGRATION COMPLETE
-- =====================================================================
