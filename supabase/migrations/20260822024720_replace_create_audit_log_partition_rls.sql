-- =====================================================================
-- replace_create_audit_log_partition_rls
--
-- Already applied on live project xlndsjocryaldfmzzkwb as version
-- 20260822024720. Live create_audit_log_partition already matches this.
-- This filename must match that live version so
-- `supabase db push --include-all` treats it as already applied.
-- =====================================================================

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
