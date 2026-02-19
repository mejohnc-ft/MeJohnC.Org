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

BEGIN;

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

COMMIT;
