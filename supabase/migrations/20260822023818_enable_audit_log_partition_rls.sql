-- =====================================================================
-- enable_audit_log_partition_rls
--
-- Already applied on live project xlndsjocryaldfmzzkwb as version
-- 20260822023818. This filename must match that live version so
-- `supabase db push --include-all` treats it as already applied.
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
