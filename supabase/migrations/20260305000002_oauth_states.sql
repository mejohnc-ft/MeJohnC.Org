-- OAuth state storage for CSRF validation (#271)
-- Stores state parameters during OAuth flows to prevent CSRF attacks.

CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  redirect_uri TEXT,
  initiated_by TEXT,  -- user who started the flow (for UI callback routing)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oauth_states_state ON public.oauth_states(state) WHERE used_at IS NULL;
CREATE INDEX idx_oauth_states_cleanup ON public.oauth_states(expires_at) WHERE used_at IS NULL;

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY oauth_states_service ON public.oauth_states
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Cleanup function for expired states
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.oauth_states
  WHERE expires_at < now() OR used_at IS NOT NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
