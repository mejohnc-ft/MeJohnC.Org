-- Prompts Migration
-- Prerequisites: schema.sql must be applied first (is_admin, update_updated_at_column)
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
