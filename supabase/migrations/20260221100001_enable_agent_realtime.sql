-- Enable Supabase Realtime on agent tables
-- Without this, neither the worker's Realtime subscription nor the frontend's
-- subscription on agent_responses will fire.
-- These were commented out in the foundation migration.

ALTER PUBLICATION supabase_realtime ADD TABLE agent_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_confirmations;
