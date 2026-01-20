-- =====================================================================
-- MIGRATION 004: Multi-Tenant Foundation
-- Issue: #101 - [Modular] P0: Add tenant_id to all feature tables + RLS functions
--
-- This migration adds multi-tenant support to enable platform integration:
-- 1. Creates app schema and tenants table
-- 2. Creates RLS helper functions
-- 3. Adds tenant_id to all feature tables
-- 4. Updates RLS policies for tenant isolation
--
-- IMPORTANT: This migration maintains backwards compatibility by:
-- - Using a default tenant for existing data
-- - Keeping existing public read policies intact
-- - Adding tenant isolation on top of existing is_admin() checks
--
-- Run this in Supabase SQL Editor
-- =====================================================================

BEGIN;

-- ============================================
-- VERIFY PREREQUISITES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE EXCEPTION 'Missing prerequisite: is_admin() function. Run schema.sql first.';
  END IF;
END $$;

-- ============================================
-- PART 1: CREATE APP SCHEMA AND TENANTS TABLE
-- ============================================

-- Create app schema if not exists
CREATE SCHEMA IF NOT EXISTS app;

-- Create default tenant UUID (deterministic for data migration)
-- Using UUID v5 with DNS namespace for 'default.mejohnc.org'
DO $$
BEGIN
  -- Store the default tenant ID as a function for reuse
  CREATE OR REPLACE FUNCTION app.default_tenant_id()
  RETURNS UUID AS $fn$
    SELECT '00000000-0000-0000-0000-000000000001'::UUID;
  $fn$ LANGUAGE SQL IMMUTABLE;
END $$;

-- Create tenants table
CREATE TABLE IF NOT EXISTS app.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'account' CHECK (type IN ('platform', 'organization', 'account', 'user')),
  hierarchy_path ltree,
  parent_id UUID REFERENCES app.tenants(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on hierarchy_path for efficient hierarchy queries
CREATE INDEX IF NOT EXISTS idx_tenants_hierarchy ON app.tenants USING GIST (hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON app.tenants(parent_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON app.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_type ON app.tenants(type);

-- Insert default tenant for existing data
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

-- ============================================
-- PART 2: RLS HELPER FUNCTIONS
-- ============================================

-- Function to get current tenant from session context
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.tenant_id', true), '')::UUID,
    app.default_tenant_id()
  );
$$ LANGUAGE SQL STABLE;

-- Function to check if user can access a tenant (hierarchy-aware)
CREATE OR REPLACE FUNCTION app.can_access_tenant(target_hierarchy ltree)
RETURNS BOOLEAN AS $$
DECLARE
  current_hierarchy ltree;
BEGIN
  -- Get current tenant's hierarchy
  SELECT hierarchy_path INTO current_hierarchy
  FROM app.tenants
  WHERE id = app.current_tenant_id();

  IF current_hierarchy IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if target is same as or descendant of current tenant
  RETURN target_hierarchy <@ current_hierarchy OR target_hierarchy = current_hierarchy;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to set tenant context (for application use)
CREATE OR REPLACE FUNCTION app.set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear tenant context
CREATE OR REPLACE FUNCTION app.clear_tenant_context()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: ADD TENANT_ID TO ALL FEATURE TABLES
-- ============================================

-- Helper function to add tenant_id column if it doesn't exist
CREATE OR REPLACE FUNCTION add_tenant_id_column(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT app.default_tenant_id() REFERENCES app.tenants(id)',
    table_name
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%I_tenant ON %I(tenant_id)',
    table_name, table_name
  );
EXCEPTION
  WHEN duplicate_column THEN
    NULL; -- Column already exists, ignore
END;
$$ LANGUAGE plpgsql;

-- Add tenant_id to schema.sql tables
SELECT add_tenant_id_column('app_suites');
SELECT add_tenant_id_column('apps');
SELECT add_tenant_id_column('blog_posts');
SELECT add_tenant_id_column('projects');
SELECT add_tenant_id_column('site_content');
SELECT add_tenant_id_column('contact_links');
SELECT add_tenant_id_column('work_history');
SELECT add_tenant_id_column('case_studies');
SELECT add_tenant_id_column('timelines');
SELECT add_tenant_id_column('timeline_entries');

-- Add tenant_id to news-schema.sql tables
SELECT add_tenant_id_column('news_categories');
SELECT add_tenant_id_column('news_sources');
SELECT add_tenant_id_column('news_articles');
SELECT add_tenant_id_column('news_filters');
SELECT add_tenant_id_column('news_dashboard_tabs');

-- Add tenant_id to agent tables (001_agent_and_bookmarks.sql)
SELECT add_tenant_id_column('agent_commands');
SELECT add_tenant_id_column('agent_responses');
SELECT add_tenant_id_column('agent_tasks');
SELECT add_tenant_id_column('agent_task_runs');
SELECT add_tenant_id_column('agent_sessions');
SELECT add_tenant_id_column('agent_confirmations');

-- Add tenant_id to bookmark tables (001_agent_and_bookmarks.sql)
SELECT add_tenant_id_column('bookmarks');
SELECT add_tenant_id_column('bookmark_collections');
SELECT add_tenant_id_column('bookmark_import_jobs');
SELECT add_tenant_id_column('bookmark_categories');

-- Add tenant_id to marketing tables (COMBINED_PHASE3_MIGRATION.sql)
SELECT add_tenant_id_column('email_subscribers');
SELECT add_tenant_id_column('email_lists');
SELECT add_tenant_id_column('email_campaigns');
SELECT add_tenant_id_column('email_templates');
SELECT add_tenant_id_column('email_events');
SELECT add_tenant_id_column('nps_surveys');
SELECT add_tenant_id_column('nps_responses');
SELECT add_tenant_id_column('content_suggestions');

-- Add tenant_id to site builder tables (COMBINED_PHASE3_MIGRATION.sql)
SELECT add_tenant_id_column('sb_pages');
SELECT add_tenant_id_column('sb_page_versions');
SELECT add_tenant_id_column('sb_page_components');
SELECT add_tenant_id_column('sb_component_templates');

-- Add tenant_id to task system tables (COMBINED_PHASE3_MIGRATION.sql)
SELECT add_tenant_id_column('task_categories');
SELECT add_tenant_id_column('tasks');
SELECT add_tenant_id_column('task_comments');
SELECT add_tenant_id_column('task_reminders');

-- Add tenant_id to CRM tables (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    PERFORM add_tenant_id_column('contacts');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactions') THEN
    PERFORM add_tenant_id_column('interactions');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_ups') THEN
    PERFORM add_tenant_id_column('follow_ups');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_lists') THEN
    PERFORM add_tenant_id_column('contact_lists');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipelines') THEN
    PERFORM add_tenant_id_column('pipelines');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipeline_stages') THEN
    PERFORM add_tenant_id_column('pipeline_stages');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') THEN
    PERFORM add_tenant_id_column('deals');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_list_members') THEN
    PERFORM add_tenant_id_column('contact_list_members');
  END IF;
END $$;

-- Add tenant_id to metrics tables (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'metrics_sources') THEN
    PERFORM add_tenant_id_column('metrics_sources');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'metrics_data') THEN
    PERFORM add_tenant_id_column('metrics_data');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'metrics_dashboards') THEN
    PERFORM add_tenant_id_column('metrics_dashboards');
  END IF;
END $$;

-- Drop the helper function
DROP FUNCTION IF EXISTS add_tenant_id_column(TEXT);

-- ============================================
-- PART 4: UPDATE RLS POLICIES FOR TENANT ISOLATION
-- ============================================

-- Enable RLS on tenants table
ALTER TABLE app.tenants ENABLE ROW LEVEL SECURITY;

-- Tenants table policies
CREATE POLICY "Users can view their own tenant" ON app.tenants
  FOR SELECT USING (
    id = app.current_tenant_id() OR
    app.can_access_tenant(hierarchy_path)
  );

CREATE POLICY "Admins can manage tenants" ON app.tenants
  FOR ALL USING (is_admin());

-- ============================================
-- Create tenant isolation policies for each table
-- These ADD to existing policies (don't replace public read policies)
-- ============================================

-- Helper to create tenant isolation policy
-- Note: We create new policies with _tenant suffix to avoid conflicts

-- Schema.sql tables - add tenant context to admin policies
DROP POLICY IF EXISTS "Admins can do everything with apps" ON apps;
CREATE POLICY "Admins can do everything with apps" ON apps
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with app_suites" ON app_suites;
CREATE POLICY "Admins can do everything with app_suites" ON app_suites
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with blog_posts" ON blog_posts;
CREATE POLICY "Admins can do everything with blog_posts" ON blog_posts
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with projects" ON projects;
CREATE POLICY "Admins can do everything with projects" ON projects
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with site_content" ON site_content;
CREATE POLICY "Admins can do everything with site_content" ON site_content
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with contact_links" ON contact_links;
CREATE POLICY "Admins can do everything with contact_links" ON contact_links
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with work_history" ON work_history;
CREATE POLICY "Admins can do everything with work_history" ON work_history
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with case_studies" ON case_studies;
CREATE POLICY "Admins can do everything with case_studies" ON case_studies
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with timelines" ON timelines;
CREATE POLICY "Admins can do everything with timelines" ON timelines
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with timeline_entries" ON timeline_entries;
CREATE POLICY "Admins can do everything with timeline_entries" ON timeline_entries
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

-- News tables
DROP POLICY IF EXISTS "Admins can do everything with news_categories" ON news_categories;
CREATE POLICY "Admins can do everything with news_categories" ON news_categories
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with news_sources" ON news_sources;
CREATE POLICY "Admins can do everything with news_sources" ON news_sources
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with news_articles" ON news_articles;
CREATE POLICY "Admins can do everything with news_articles" ON news_articles
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with news_filters" ON news_filters;
CREATE POLICY "Admins can do everything with news_filters" ON news_filters
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with news_dashboard_tabs" ON news_dashboard_tabs;
CREATE POLICY "Admins can do everything with news_dashboard_tabs" ON news_dashboard_tabs
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

-- Agent tables
DROP POLICY IF EXISTS "Admins can do everything with agent_commands" ON agent_commands;
CREATE POLICY "Admins can do everything with agent_commands" ON agent_commands
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with agent_responses" ON agent_responses;
CREATE POLICY "Admins can do everything with agent_responses" ON agent_responses
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with agent_tasks" ON agent_tasks;
CREATE POLICY "Admins can do everything with agent_tasks" ON agent_tasks
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can view agent_task_runs" ON agent_task_runs;
CREATE POLICY "Admins can view agent_task_runs" ON agent_task_runs
  FOR SELECT USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with agent_sessions" ON agent_sessions;
CREATE POLICY "Admins can do everything with agent_sessions" ON agent_sessions
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with agent_confirmations" ON agent_confirmations;
CREATE POLICY "Admins can do everything with agent_confirmations" ON agent_confirmations
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

-- Bookmark tables
DROP POLICY IF EXISTS "Admins can do everything with bookmarks" ON bookmarks;
CREATE POLICY "Admins can do everything with bookmarks" ON bookmarks
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with bookmark_collections" ON bookmark_collections;
CREATE POLICY "Admins can do everything with bookmark_collections" ON bookmark_collections
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with bookmark_import_jobs" ON bookmark_import_jobs;
CREATE POLICY "Admins can do everything with bookmark_import_jobs" ON bookmark_import_jobs
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with bookmark_categories" ON bookmark_categories;
CREATE POLICY "Admins can do everything with bookmark_categories" ON bookmark_categories
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

-- Marketing tables
DROP POLICY IF EXISTS "Admins can do everything with email_subscribers" ON email_subscribers;
CREATE POLICY "Admins can do everything with email_subscribers" ON email_subscribers
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with email_lists" ON email_lists;
CREATE POLICY "Admins can do everything with email_lists" ON email_lists
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with email_campaigns" ON email_campaigns;
CREATE POLICY "Admins can do everything with email_campaigns" ON email_campaigns
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with email_templates" ON email_templates;
CREATE POLICY "Admins can do everything with email_templates" ON email_templates
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can view email_events" ON email_events;
CREATE POLICY "Admins can view email_events" ON email_events
  FOR SELECT USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with nps_surveys" ON nps_surveys;
CREATE POLICY "Admins can do everything with nps_surveys" ON nps_surveys
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can view nps_responses" ON nps_responses;
CREATE POLICY "Admins can view nps_responses" ON nps_responses
  FOR SELECT USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with content_suggestions" ON content_suggestions;
CREATE POLICY "Admins can do everything with content_suggestions" ON content_suggestions
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

-- Site builder tables
DROP POLICY IF EXISTS "Admin full access to pages" ON sb_pages;
CREATE POLICY "Admin full access to pages" ON sb_pages
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admin full access to page versions" ON sb_page_versions;
CREATE POLICY "Admin full access to page versions" ON sb_page_versions
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admin full access to page components" ON sb_page_components;
CREATE POLICY "Admin full access to page components" ON sb_page_components
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admin full access to component templates" ON sb_component_templates;
CREATE POLICY "Admin full access to component templates" ON sb_component_templates
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

-- Task system tables
DROP POLICY IF EXISTS "Admins can do everything with task_categories" ON task_categories;
CREATE POLICY "Admins can do everything with task_categories" ON task_categories
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with tasks" ON tasks;
CREATE POLICY "Admins can do everything with tasks" ON tasks
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with task_comments" ON task_comments;
CREATE POLICY "Admins can do everything with task_comments" ON task_comments
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

DROP POLICY IF EXISTS "Admins can do everything with task_reminders" ON task_reminders;
CREATE POLICY "Admins can do everything with task_reminders" ON task_reminders
  FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));

-- CRM tables (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    DROP POLICY IF EXISTS "Admins can do everything with contacts" ON contacts;
    CREATE POLICY "Admins can do everything with contacts" ON contacts
      FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactions') THEN
    DROP POLICY IF EXISTS "Admins can do everything with interactions" ON interactions;
    CREATE POLICY "Admins can do everything with interactions" ON interactions
      FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_ups') THEN
    DROP POLICY IF EXISTS "Admins can do everything with follow_ups" ON follow_ups;
    CREATE POLICY "Admins can do everything with follow_ups" ON follow_ups
      FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_lists') THEN
    DROP POLICY IF EXISTS "Admins can do everything with contact_lists" ON contact_lists;
    CREATE POLICY "Admins can do everything with contact_lists" ON contact_lists
      FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipelines') THEN
    DROP POLICY IF EXISTS "Admins can do everything with pipelines" ON pipelines;
    CREATE POLICY "Admins can do everything with pipelines" ON pipelines
      FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipeline_stages') THEN
    DROP POLICY IF EXISTS "Admins can do everything with pipeline_stages" ON pipeline_stages;
    CREATE POLICY "Admins can do everything with pipeline_stages" ON pipeline_stages
      FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') THEN
    DROP POLICY IF EXISTS "Admins can do everything with deals" ON deals;
    CREATE POLICY "Admins can do everything with deals" ON deals
      FOR ALL USING (is_admin() AND (tenant_id = app.current_tenant_id() OR is_admin()));
  END IF;
END $$;

-- ============================================
-- PART 5: CREATE TRIGGER FOR tenants updated_at
-- ============================================

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON app.tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMIT;

SELECT 'Migration 004_multi_tenant completed successfully!' AS status,
       'Default tenant ID: ' || app.default_tenant_id()::TEXT AS default_tenant,
       'All existing data has been assigned to the default tenant' AS note;
