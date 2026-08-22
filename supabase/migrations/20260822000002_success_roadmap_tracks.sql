-- Success Roadmap tracks on the existing provisioning-roadmap timeline.
-- Adds AI Products + Endpoint Logistics without a new public table.
-- Existing year entries are tagged endpoint-logistics; AI product pills are seeded.
-- RLS on timelines / timeline_entries is unchanged (public read of active timelines only).

ALTER TABLE public.timeline_entries
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'endpoint-logistics';

ALTER TABLE public.timeline_entries
  ADD COLUMN IF NOT EXISTS entry_key TEXT;

ALTER TABLE public.timeline_entries
  DROP CONSTRAINT IF EXISTS timeline_entries_track_check;

ALTER TABLE public.timeline_entries
  ADD CONSTRAINT timeline_entries_track_check
  CHECK (track IN ('ai-products', 'endpoint-logistics'));

CREATE INDEX IF NOT EXISTS idx_timeline_entries_track
  ON public.timeline_entries (timeline_id, track, order_index);

CREATE UNIQUE INDEX IF NOT EXISTS idx_timeline_entries_entry_key
  ON public.timeline_entries (timeline_id, entry_key)
  WHERE entry_key IS NOT NULL;

COMMENT ON COLUMN public.timeline_entries.track IS
  'Success Roadmap track: ai-products (default UI) or endpoint-logistics.';

COMMENT ON COLUMN public.timeline_entries.entry_key IS
  'Stable key matching typed portfolio briefs or year labels.';

UPDATE public.timelines
SET
  name = 'Success Roadmap',
  description = 'Two tracks: AI Products (governed MSP portfolio) and Endpoint Logistics (provisioning transformation).'
WHERE slug = 'provisioning-roadmap';

UPDATE public.timeline_entries AS e
SET
  track = 'endpoint-logistics',
  entry_key = COALESCE(e.entry_key, e.label)
FROM public.timelines AS t
WHERE e.timeline_id = t.id
  AND t.slug = 'provisioning-roadmap'
  AND e.label IN ('2022-2023', '2024', '2025', '2026+');

INSERT INTO public.timeline_entries (
  timeline_id,
  label,
  phase,
  summary,
  content,
  dot_position,
  order_index,
  track,
  entry_key
)
SELECT
  t.id,
  v.label,
  v.phase,
  v.summary,
  v.content,
  v.dot_position,
  v.order_index,
  'ai-products',
  v.entry_key
FROM public.timelines AS t
CROSS JOIN (
  VALUES
    (
      'Client Toolbox',
      'Evidence-backed vITM',
      'Identity, endpoint, security, network, licensing, and service data into QBR-ready decisions.',
      'See the public AI Products brief for capabilities, stack, and readiness. Owner: John.',
      72,
      0,
      'client-toolbox'
    ),
    (
      'Service Desk Toolbox',
      'Technician work + Incident Buddy',
      'Halo tickets routed to governed automations and 10-domain investigations.',
      'See the public AI Products brief. Owner: Toby.',
      68,
      1,
      'service-desk-toolbox'
    ),
    (
      'Iris',
      'Governed employee AI',
      'Company-grounded assistant with durable skills and approval-gated action.',
      'See the public AI Products brief. Owner: John. accessAI federation is pre-GA.',
      80,
      2,
      'iris'
    ),
    (
      'Proxima',
      'Governed agentic engineering',
      'Approved Vantage work into reviewed branches, draft PRs, and green CI.',
      'See the public AI Products brief. Draft-mode autonomy; humans retain merge and deploy.',
      64,
      3,
      'proxima'
    ),
    (
      'accessAI',
      'AI control plane (pre-GA)',
      'Identities, models, agents, tools, policy, cost, audit, evaluation, promotion, rollback.',
      'See the public AI Products brief. Substantial control plane, not sellable-GA as a universal plane.',
      58,
      4,
      'accessai'
    )
) AS v(label, phase, summary, content, dot_position, order_index, entry_key)
WHERE t.slug = 'provisioning-roadmap'
  AND NOT EXISTS (
    SELECT 1
    FROM public.timeline_entries AS existing
    WHERE existing.timeline_id = t.id
      AND existing.entry_key = v.entry_key
  );
