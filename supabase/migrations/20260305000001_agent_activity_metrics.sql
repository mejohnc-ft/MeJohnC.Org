-- Per-agent activity metrics RPC (#272)
-- Aggregates metrics from audit_logs, agent_commands, agent_responses, and agent_memories.

CREATE OR REPLACE FUNCTION public.get_agent_activity_stats(
  p_agent_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  cutoff TIMESTAMPTZ := now() - (p_hours || ' hours')::INTERVAL;
BEGIN
  SELECT jsonb_build_object(
    'agent_id', p_agent_id,
    'period_hours', p_hours,

    -- Command counts
    'total_commands', (
      SELECT count(*) FROM public.agent_commands
      WHERE user_id = p_agent_id::TEXT
      AND created_at >= cutoff
    ),
    'completed_commands', (
      SELECT count(*) FROM public.agent_commands
      WHERE user_id = p_agent_id::TEXT
      AND status = 'completed'
      AND created_at >= cutoff
    ),
    'failed_commands', (
      SELECT count(*) FROM public.agent_commands
      WHERE user_id = p_agent_id::TEXT
      AND status = 'failed'
      AND created_at >= cutoff
    ),

    -- Success rate
    'success_rate', (
      SELECT CASE
        WHEN count(*) = 0 THEN 0
        ELSE round(
          count(*) FILTER (WHERE status = 'completed')::NUMERIC
          / count(*)::NUMERIC * 100, 1
        )
      END
      FROM public.agent_commands
      WHERE user_id = p_agent_id::TEXT
      AND status IN ('completed', 'failed')
      AND created_at >= cutoff
    ),

    -- Response metrics
    'total_responses', (
      SELECT count(*) FROM public.agent_responses r
      JOIN public.agent_commands c ON c.id = r.command_id
      WHERE c.user_id = p_agent_id::TEXT
      AND r.created_at >= cutoff
    ),

    -- Avg response latency (ms) from command created_at to completed_at
    'avg_latency_ms', (
      SELECT coalesce(
        round(avg(
          EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000
        ))::INTEGER,
        0
      )
      FROM public.agent_commands
      WHERE user_id = p_agent_id::TEXT
      AND status = 'completed'
      AND completed_at IS NOT NULL
      AND created_at >= cutoff
    ),

    -- Tool call frequency (from audit log details)
    'total_tool_calls', (
      SELECT coalesce(sum((details->>'tool_calls')::INTEGER), 0)
      FROM public.audit_logs
      WHERE actor_id = p_agent_id::TEXT
      AND action = 'agent.execute'
      AND created_at >= cutoff
    ),

    -- Top tools used (from agent_responses metadata)
    'top_tools', (
      SELECT coalesce(jsonb_agg(tool_stat), '[]'::JSONB)
      FROM (
        SELECT jsonb_build_object('tool', tool, 'count', cnt) AS tool_stat
        FROM (
          SELECT
            jsonb_array_elements_text(r.metadata->'tool_names') AS tool,
            count(*) AS cnt
          FROM public.agent_responses r
          JOIN public.agent_commands c ON c.id = r.command_id
          WHERE c.user_id = p_agent_id::TEXT
          AND r.metadata ? 'tool_names'
          AND r.created_at >= cutoff
          GROUP BY tool
          ORDER BY cnt DESC
          LIMIT 5
        ) sub
      ) sub2
    ),

    -- Memory count
    'memory_count', (
      SELECT count(*) FROM public.agent_memories
      WHERE agent_id = p_agent_id
    ),

    -- Audit events count
    'audit_events', (
      SELECT count(*) FROM public.audit_logs
      WHERE actor_id = p_agent_id::TEXT
      AND created_at >= cutoff
    ),

    -- Recent activity timeline (last 10 events)
    'recent_activity', (
      SELECT coalesce(jsonb_agg(activity), '[]'::JSONB)
      FROM (
        SELECT jsonb_build_object(
          'action', action,
          'resource_type', resource_type,
          'resource_id', resource_id,
          'details', details,
          'created_at', created_at
        ) AS activity
        FROM public.audit_logs
        WHERE actor_id = p_agent_id::TEXT
        AND created_at >= cutoff
        ORDER BY created_at DESC
        LIMIT 10
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Heartbeat: update last_seen_at and health_status
CREATE OR REPLACE FUNCTION public.agent_heartbeat(
  p_agent_id UUID,
  p_health_status TEXT DEFAULT 'healthy'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.agents
  SET
    last_seen_at = now(),
    health_status = p_health_status,
    updated_at = now()
  WHERE id = p_agent_id;
END;
$$;
