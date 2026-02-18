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
