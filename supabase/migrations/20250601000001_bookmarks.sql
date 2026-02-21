-- Bookmarks Database Schema
-- Run this in Supabase SQL Editor after schema.sql
-- Stores imported bookmarks from Twitter/X (via Smaug), Pocket, and manual entries

-- ============================================
-- BOOKMARKS (main storage)
-- ============================================
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source information
  source TEXT NOT NULL CHECK (source IN ('twitter', 'pocket', 'raindrop', 'manual', 'other')),
  source_id TEXT,                              -- Original ID from source (tweet ID, etc.)
  source_url TEXT,                             -- Original source page URL

  -- Content
  url TEXT NOT NULL,                           -- Primary URL (the bookmarked link)
  title TEXT,
  description TEXT,                            -- Original description or excerpt
  content TEXT,                                -- Extracted full content (markdown)

  -- Author info
  author TEXT,
  author_handle TEXT,                          -- e.g., @username for Twitter
  author_avatar_url TEXT,

  -- Organization
  tags TEXT[] DEFAULT '{}',                    -- User-assigned tags
  category TEXT,                               -- Single category

  -- AI-generated metadata
  ai_summary TEXT,                             -- Claude-generated summary
  ai_tags TEXT[] DEFAULT '{}',                 -- Claude-suggested tags
  ai_category TEXT,                            -- Claude-suggested category
  ai_processed_at TIMESTAMPTZ,                 -- When AI processing was done

  -- Status flags
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,             -- Visible on public bookmarks page

  -- Media
  image_url TEXT,                              -- Preview image
  favicon_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',                 -- Source-specific data (retweet count, likes, etc.)

  -- Timestamps
  published_at TIMESTAMPTZ,                    -- When original content was published
  imported_at TIMESTAMPTZ DEFAULT now(),       -- When imported into system
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- BOOKMARK COLLECTIONS (folders/groups)
-- ============================================
CREATE TABLE IF NOT EXISTS bookmark_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  color TEXT DEFAULT 'blue',                   -- Badge/accent color
  is_public BOOLEAN DEFAULT false,             -- Visible on public page
  is_smart BOOLEAN DEFAULT false,              -- Auto-populated based on rules
  smart_rules JSONB,                           -- Rules for smart collections
  sort_order INTEGER DEFAULT 0,
  item_count INTEGER DEFAULT 0,                -- Cached count
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- BOOKMARK COLLECTION ITEMS (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS bookmark_collection_items (
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES bookmark_collections(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,                                  -- Per-collection notes
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (bookmark_id, collection_id)
);

-- ============================================
-- BOOKMARK IMPORT JOBS (track import batches)
-- ============================================
CREATE TABLE IF NOT EXISTS bookmark_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,                        -- 'smaug', 'pocket_export', 'manual_csv', etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  file_path TEXT,                              -- Path to import file
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  imported_items INTEGER DEFAULT 0,
  skipped_items INTEGER DEFAULT 0,             -- Duplicates or errors
  error_log TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- BOOKMARK CATEGORIES (predefined categories)
-- ============================================
CREATE TABLE IF NOT EXISTS bookmark_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'gray',
  icon TEXT,                                   -- Lucide icon name
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
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

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_bookmarks_fts ON bookmarks
  USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')));

CREATE INDEX IF NOT EXISTS idx_bookmark_collections_slug ON bookmark_collections(slug);
CREATE INDEX IF NOT EXISTS idx_bookmark_collections_public ON bookmark_collections(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_bookmark_collections_order ON bookmark_collections(sort_order);

CREATE INDEX IF NOT EXISTS idx_bookmark_collection_items_bookmark ON bookmark_collection_items(bookmark_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_collection_items_collection ON bookmark_collection_items(collection_id);

CREATE INDEX IF NOT EXISTS idx_bookmark_import_jobs_status ON bookmark_import_jobs(status);

CREATE INDEX IF NOT EXISTS idx_bookmark_categories_slug ON bookmark_categories(slug);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_categories ENABLE ROW LEVEL SECURITY;

-- Public can view public bookmarks
CREATE POLICY "Public can view public bookmarks" ON bookmarks
  FOR SELECT USING (is_public = true AND is_archived = false);

-- Public can view public collections
CREATE POLICY "Public can view public collections" ON bookmark_collections
  FOR SELECT USING (is_public = true);

-- Public can view items in public collections
CREATE POLICY "Public can view public collection items" ON bookmark_collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookmark_collections
      WHERE bookmark_collections.id = bookmark_collection_items.collection_id
      AND bookmark_collections.is_public = true
    )
  );

-- Public can view categories
CREATE POLICY "Public can view bookmark categories" ON bookmark_categories
  FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "Admins can do everything with bookmarks" ON bookmarks
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with bookmark_collections" ON bookmark_collections
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with bookmark_collection_items" ON bookmark_collection_items
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with bookmark_import_jobs" ON bookmark_import_jobs
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can do everything with bookmark_categories" ON bookmark_categories
  FOR ALL USING (is_admin());

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_bookmarks_updated_at
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookmark_collections_updated_at
  BEFORE UPDATE ON bookmark_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update collection item count when items change
CREATE OR REPLACE FUNCTION update_collection_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bookmark_collections
    SET item_count = item_count + 1, updated_at = now()
    WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bookmark_collections
    SET item_count = item_count - 1, updated_at = now()
    WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_collection_count_on_insert
  AFTER INSERT ON bookmark_collection_items
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_item_count();

CREATE TRIGGER update_collection_count_on_delete
  AFTER DELETE ON bookmark_collection_items
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_item_count();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Full-text search function
CREATE OR REPLACE FUNCTION search_bookmarks(search_query TEXT)
RETURNS SETOF bookmarks AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM bookmarks
  WHERE to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, ''))
        @@ plainto_tsquery('english', search_query)
  ORDER BY ts_rank(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')),
    plainto_tsquery('english', search_query)
  ) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA: Default Categories
-- ============================================
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

-- ============================================
-- SEED DATA: Default Collections
-- ============================================
INSERT INTO bookmark_collections (name, slug, description, color, sort_order) VALUES
  ('Read Later', 'read-later', 'Articles and content to read later', 'blue', 0),
  ('Favorites', 'favorites', 'Best bookmarks worth revisiting', 'yellow', 1),
  ('AI & ML', 'ai-ml', 'Artificial intelligence and machine learning resources', 'purple', 2),
  ('Dev Tools', 'dev-tools', 'Development tools and utilities', 'green', 3)
ON CONFLICT (slug) DO NOTHING;
