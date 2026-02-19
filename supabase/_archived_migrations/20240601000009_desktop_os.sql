-- Desktop OS Migration — Virtual Filesystem + Workspaces
-- Issue: #196 Phase 3 — File Explorer + Virtual Filesystem
-- Prerequisites: schema.sql (is_admin, update_updated_at_column)
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
