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
