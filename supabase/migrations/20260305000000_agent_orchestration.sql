-- Multi-agent orchestration tables (#270)
-- Supports fan-out task broadcast, response collection, and inter-agent messaging.

-- ─── Agent Messages (inter-agent message bus) ───────────────────────

CREATE TABLE IF NOT EXISTS public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  to_agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,  -- NULL = broadcast
  channel TEXT NOT NULL DEFAULT 'default',
  message_type TEXT NOT NULL CHECK (message_type IN ('task', 'result', 'status', 'delegation')),
  content JSONB NOT NULL DEFAULT '{}',
  correlation_id UUID,  -- groups related messages (e.g. orchestration run)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'read', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_messages_to_agent ON public.agent_messages(to_agent_id, status) WHERE status = 'pending';
CREATE INDEX idx_agent_messages_correlation ON public.agent_messages(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_agent_messages_channel ON public.agent_messages(channel, created_at DESC);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_messages_tenant_isolation ON public.agent_messages
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ─── Orchestration Runs (fan-out coordination) ─────────────────────

CREATE TABLE IF NOT EXISTS public.orchestration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_run_id UUID REFERENCES public.workflow_runs(id) ON DELETE SET NULL,
  step_id TEXT,
  command TEXT NOT NULL,
  agent_ids UUID[] NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'merge_all' CHECK (strategy IN ('first_completed', 'best_score', 'merge_all', 'consensus')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timed_out')),
  result JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  timeout_ms INTEGER NOT NULL DEFAULT 20000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orchestration_runs_status ON public.orchestration_runs(status) WHERE status = 'running';

ALTER TABLE public.orchestration_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY orchestration_runs_tenant_isolation ON public.orchestration_runs
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ─── Orchestration Responses (per-agent results) ────────────────────

CREATE TABLE IF NOT EXISTS public.orchestration_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestration_run_id UUID NOT NULL REFERENCES public.orchestration_runs(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timed_out')),
  response TEXT,
  tool_calls INTEGER DEFAULT 0,
  turns INTEGER DEFAULT 0,
  score REAL,  -- optional quality/confidence score from the agent
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_orch_responses_run ON public.orchestration_responses(orchestration_run_id, status);
CREATE UNIQUE INDEX idx_orch_responses_run_agent ON public.orchestration_responses(orchestration_run_id, agent_id);

ALTER TABLE public.orchestration_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY orchestration_responses_tenant_isolation ON public.orchestration_responses
  USING (orchestration_run_id IN (
    SELECT id FROM public.orchestration_runs
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

-- Service role bypass for edge functions
CREATE POLICY agent_messages_service ON public.agent_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY orchestration_runs_service ON public.orchestration_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY orchestration_responses_service ON public.orchestration_responses
  FOR ALL TO service_role USING (true) WITH CHECK (true);
