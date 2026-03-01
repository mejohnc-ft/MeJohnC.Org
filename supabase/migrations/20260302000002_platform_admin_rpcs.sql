-- Platform admin RPCs for super-admin panel (#310)

-- List tenants with search and pagination
CREATE OR REPLACE FUNCTION app.list_tenants(
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS SETOF app.tenants
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM app.tenants
  WHERE (p_search IS NULL OR p_search = ''
    OR name ILIKE '%' || p_search || '%'
    OR slug ILIKE '%' || p_search || '%')
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Get platform-wide stats
CREATE OR REPLACE FUNCTION app.get_platform_stats()
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_tenants', (SELECT count(*) FROM app.tenants),
    'active_tenants', (SELECT count(*) FROM app.tenants WHERE is_active = true),
    'total_users', (SELECT count(*) FROM auth.users),
    'plan_distribution', (
      SELECT coalesce(json_object_agg(plan, cnt), '{}')
      FROM (
        SELECT coalesce(settings->>'plan', 'free') AS plan, count(*) AS cnt
        FROM app.tenants
        GROUP BY coalesce(settings->>'plan', 'free')
      ) sub
    )
  );
$$;

-- Toggle tenant active status
CREATE OR REPLACE FUNCTION app.toggle_tenant_status(
  p_tenant_id UUID,
  p_is_active BOOLEAN
)
RETURNS void
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE app.tenants
  SET is_active = p_is_active, updated_at = now()
  WHERE id = p_tenant_id;
$$;
