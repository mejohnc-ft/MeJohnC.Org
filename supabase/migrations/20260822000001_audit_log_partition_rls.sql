-- =====================================================================
-- MIGRATION: Enable RLS on public.audit_log monthly partitions
--
-- Live alert: rls_disabled_in_public on project xlndsjocryaldfmzzkwb
--
-- Parent public.audit_log already has RLS + "Admins can do everything
-- with audit_log". Postgres does not copy relrowsecurity (or policies)
-- onto child partitions. PostgREST still exposes each partition as its
-- own relation, so a caller with the project URL could hit
-- /rest/v1/audit_log_2026_02 and bypass parent RLS.
--
-- Live partitions at apply time (Aug 2026):
--   audit_log_2026_02  (20 rows)
--   audit_log_2026_03 through audit_log_2026_08  (empty)
-- plus any later months already created by pg_cron.
--
-- Grants: do NOT GRANT these partitions to anon. Public portfolio
-- reads go through other tables (site_content, apps, projects, …).
-- After 2026-05-30, new public tables are not auto-exposed to the
-- Data API without an explicit GRANT (enforced on existing projects
-- 2026-10-30). This migration only REVOKEs client roles on partitions.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.secure_audit_log_partition(p_partition_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_partition_name IS NULL
     OR p_partition_name !~ '^audit_log_[0-9]{4}_[0-9]{2}$' THEN
    RAISE EXCEPTION 'Invalid audit_log partition name: %', p_partition_name;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_inherits i ON i.inhrelid = c.oid
    JOIN pg_catalog.pg_class parent ON parent.oid = i.inhparent
    JOIN pg_catalog.pg_namespace pn ON pn.oid = parent.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = p_partition_name
      AND pn.nspname = 'public'
      AND parent.relname = 'audit_log'
  ) THEN
    RAISE EXCEPTION '% is not a partition of public.audit_log', p_partition_name;
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
    p_partition_name
  );

  -- Copy the parent policy so direct partition access matches audit_log.
  EXECUTE format(
    'DROP POLICY IF EXISTS %I ON public.%I',
    'Admins can do everything with audit_log',
    p_partition_name
  );

  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR ALL USING (is_admin())',
    'Admins can do everything with audit_log',
    p_partition_name
  );

  -- Defense in depth: keep partitions out of the anon Data API.
  EXECUTE format(
    'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',
    p_partition_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.secure_audit_log_partition(text) FROM PUBLIC;

COMMENT ON FUNCTION public.secure_audit_log_partition(text) IS
  'Enable RLS, copy parent audit_log admin policy, and revoke anon/authenticated grants on one monthly partition.';

-- Rewrite the monthly partition factory so future months cannot regress.
CREATE OR REPLACE FUNCTION public.create_audit_log_partition()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  next_month date;
  partition_name text;
  start_date text;
  end_date text;
BEGIN
  next_month := date_trunc('month', now() + interval '1 month')::date;
  partition_name := 'audit_log_' || to_char(next_month, 'YYYY_MM');
  start_date := to_char(next_month, 'YYYY-MM-DD');
  end_date := to_char(next_month + interval '1 month', 'YYYY-MM-DD');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );

  PERFORM public.secure_audit_log_partition(partition_name);
END;
$$;

COMMENT ON FUNCTION public.create_audit_log_partition() IS
  'Create next month''s audit_log partition with RLS enabled and no anon grants.';

-- Backfill every existing child partition (Feb–Aug 2026 and any extras).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_catalog.pg_inherits i
    JOIN pg_catalog.pg_class c ON c.oid = i.inhrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_class parent ON parent.oid = i.inhparent
    JOIN pg_catalog.pg_namespace pn ON pn.oid = parent.relnamespace
    WHERE pn.nspname = 'public'
      AND parent.relname = 'audit_log'
      AND n.nspname = 'public'
    ORDER BY c.relname
  LOOP
    PERFORM public.secure_audit_log_partition(r.relname);
  END LOOP;
END;
$$;
