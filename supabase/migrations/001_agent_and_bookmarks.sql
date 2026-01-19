-- Combined Migration: Agent & Bookmarks Infrastructure
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
CREATE POLICY "Admins can do everything with agent_tasks" ON agent_tasks FOR ALL USING (is_admin());
CREATE POLICY "Admins can view agent_task_runs" ON agent_task_runs FOR SELECT USING (is_admin());
CREATE POLICY "Admins can do everything with agent_sessions" ON agent_sessions FOR ALL USING (is_admin());
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
CREATE POLICY "Public can view public collection items" ON bookmark_collection_items FOR SELECT USING (EXISTS (SELECT 1 FROM bookmark_collections WHERE bookmark_collections.id = bookmark_collection_items.collection_id AND bookmark_collections.is_public = true));
CREATE POLICY "Public can view bookmark categories" ON bookmark_categories FOR SELECT USING (true);
CREATE POLICY "Admins can do everything with bookmarks" ON bookmarks FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with bookmark_collections" ON bookmark_collections FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with bookmark_collection_items" ON bookmark_collection_items FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything with bookmark_import_jobs" ON bookmark_import_jobs FOR ALL USING (is_admin());
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
