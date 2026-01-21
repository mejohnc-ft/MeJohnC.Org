-- Task System Migration
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
