-- =====================================================================
-- enable_audit_log_partition_rls
--
-- Already applied on live project xlndsjocryaldfmzzkwb (2026-08-22).
-- Do not re-run this against that project to "patch" the seven partitions;
-- they already have ENABLE ROW LEVEL SECURITY and the admin policy.
-- This file keeps local / fresh projects in sync with that live apply,
-- and replaces create_audit_log_partition so September+ cannot regress.
--
-- Parent public.audit_log already had RLS. Child partitions do not
-- inherit relrowsecurity. Direct Data API access to audit_log_YYYY_MM
-- therefore bypassed parent policies.
--
-- Live apply (idempotent here):
--   ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--   CREATE POLICY "Admins can do everything with audit_log"
--     ON ... FOR ALL USING (is_admin())
--   for public.audit_log_2026_02 through public.audit_log_2026_08
--
-- Do not GRANT these partitions to anon. Public site reads use
-- site_content / apps / projects / work_history / etc.
-- =====================================================================

-- Shared by the Feb–Aug backfill and by create_audit_log_partition.
CREATE OR REPLACE FUNCTION public.enable_audit_log_partition_rls(p_partition_name text)
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

  IF to_regclass('public.' || p_partition_name) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
    p_partition_name
  );

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
END;
$$;

REVOKE ALL ON FUNCTION public.enable_audit_log_partition_rls(text) FROM PUBLIC;

COMMENT ON FUNCTION public.enable_audit_log_partition_rls(text) IS
  'ENABLE ROW LEVEL SECURITY and copy parent audit_log admin policy onto one monthly partition.';

-- Same operations the owner already ran on live (skip missing tables on fresh local).
SELECT public.enable_audit_log_partition_rls('audit_log_2026_02');
SELECT public.enable_audit_log_partition_rls('audit_log_2026_03');
SELECT public.enable_audit_log_partition_rls('audit_log_2026_04');
SELECT public.enable_audit_log_partition_rls('audit_log_2026_05');
SELECT public.enable_audit_log_partition_rls('audit_log_2026_06');
SELECT public.enable_audit_log_partition_rls('audit_log_2026_07');
SELECT public.enable_audit_log_partition_rls('audit_log_2026_08');

-- Next month (pg_cron on the 25th) must be created WITH RLS + the same policy.
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

  PERFORM public.enable_audit_log_partition_rls(partition_name);
END;
$$;

COMMENT ON FUNCTION public.create_audit_log_partition() IS
  'Create next month''s audit_log partition with RLS enabled and the parent admin policy.';
