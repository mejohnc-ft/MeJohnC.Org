-- Agent Memory via pgvector
-- Enables semantic memory retrieval for agents using vector embeddings.
-- Issue: #269

-- ─── Enable pgvector extension ──────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Agent Memories Table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_id UUID,
  command_id UUID,

  -- Embedded content
  summary TEXT NOT NULL,
  embedding vector(1536) NOT NULL,

  -- Original content (truncated for reference)
  command_text TEXT,
  response_text TEXT,

  -- Metadata
  tool_names TEXT[] DEFAULT '{}',
  turn_count INTEGER DEFAULT 0,
  importance FLOAT DEFAULT 1.0,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- Lifecycle
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding
  ON agent_memories
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- B-tree indexes for filtering
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent_id ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_created_at ON agent_memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_expires_at ON agent_memories(expires_at);

-- ─── RLS ────────────────────────────────────────────────────────────

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

-- Admins can manage all memories
DROP POLICY IF EXISTS "Admins manage agent_memories" ON agent_memories;
CREATE POLICY "Admins manage agent_memories" ON agent_memories
  FOR ALL USING (is_admin());

-- Service role (edge functions) can do everything
DROP POLICY IF EXISTS "Service role manages agent_memories" ON agent_memories;
CREATE POLICY "Service role manages agent_memories" ON agent_memories
  FOR ALL USING (auth.role() = 'service_role');

-- ─── RPC: match_agent_memories ──────────────────────────────────────
-- Returns top-k semantically similar memories for an agent.

CREATE OR REPLACE FUNCTION match_agent_memories(
  p_agent_id UUID,
  p_embedding vector(1536),
  p_match_count INTEGER DEFAULT 5,
  p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  summary TEXT,
  command_text TEXT,
  response_text TEXT,
  tool_names TEXT[],
  importance FLOAT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.id,
    am.summary,
    am.command_text,
    am.response_text,
    am.tool_names,
    am.importance,
    1 - (am.embedding <=> p_embedding) AS similarity,
    am.created_at
  FROM agent_memories am
  WHERE am.agent_id = p_agent_id
    AND am.expires_at > now()
    AND 1 - (am.embedding <=> p_embedding) >= p_threshold
  ORDER BY am.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;

-- ─── RPC: touch_agent_memories ──────────────────────────────────────
-- Increment access count and update last_accessed_at for retrieved memories.

CREATE OR REPLACE FUNCTION touch_agent_memories(p_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agent_memories
  SET
    access_count = access_count + 1,
    last_accessed_at = now()
  WHERE id = ANY(p_ids);
END;
$$;

-- ─── RPC: cleanup_expired_agent_memories ────────────────────────────
-- Deletes expired memories. Intended for daily pg_cron invocation.

CREATE OR REPLACE FUNCTION cleanup_expired_agent_memories()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM agent_memories WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

SELECT 'Migration 20260303000001_agent_memory_pgvector completed' AS status;
