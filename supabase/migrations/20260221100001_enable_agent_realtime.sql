-- Enable Supabase Realtime on agent tables
-- Without this, neither the worker's Realtime subscription nor the frontend's
-- subscription on agent_responses will fire.
-- These were commented out in the foundation migration.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['agent_commands', 'agent_responses', 'agent_confirmations']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      RAISE NOTICE 'Added % to supabase_realtime', tbl;
    ELSE
      RAISE NOTICE '% already in supabase_realtime, skipping', tbl;
    END IF;
  END LOOP;
END $$;
