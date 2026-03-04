-- =====================================================================
-- MIGRATION: Grant USAGE on app schema to PostgREST roles
--
-- The app schema is now exposed via PostgREST (config.toml + Management
-- API), but PostgreSQL requires USAGE privilege on a schema before any
-- objects inside it can be accessed.  Without this, all .schema("app")
-- RPC calls fail with "permission denied for schema app".
-- =====================================================================

GRANT USAGE ON SCHEMA app TO anon;
GRANT USAGE ON SCHEMA app TO authenticated;
GRANT USAGE ON SCHEMA app TO service_role;
