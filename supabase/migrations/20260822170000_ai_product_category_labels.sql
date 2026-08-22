-- Recast public AI product timeline labels to stranger-readable categories.
-- Internal entry_key slugs stay for routing. Owner / pre-GA / MSP copy is cleared.

UPDATE public.timelines
SET
  description = 'Two tracks: AI Products (governed enterprise work) and Endpoint Logistics (provisioning transformation).'
WHERE slug = 'provisioning-roadmap';

UPDATE public.timeline_entries AS e
SET
  label = v.label,
  phase = v.phase,
  summary = v.summary,
  content = NULL,
  dot_position = v.dot_position,
  order_index = v.order_index
FROM public.timelines AS t,
(
  VALUES
    (
      'service-desk-toolbox',
      'Service Delivery',
      'Technician automations',
      'Ticket-linked automations for identity, mail, and access; humans review before writeback.',
      70,
      0
    ),
    (
      'client-toolbox',
      'Portfolio Management',
      'Evidence-backed client reviews',
      'A workspace that turns identity, endpoint, and security evidence into a client book you can explain.',
      78,
      1
    ),
    (
      'iris',
      'Multimodal Enterprise Agent',
      'Governed employee AI',
      'The assistant people talk to, with durable skills and approval-gated action.',
      82,
      3
    ),
    (
      'proxima',
      'DevOps Teammate',
      'Governed agentic engineering',
      'Draft branch, draft PR, and green CI for approved work; humans still merge.',
      62,
      6
    ),
    (
      'accessai',
      'Agent and Compute Federation Platform',
      'AI control plane',
      'Identities, models, agents, tools, cost, audit, evaluation, and rollback. Not an end-user assistant.',
      56,
      5
    )
) AS v(entry_key, label, phase, summary, dot_position, order_index)
WHERE e.timeline_id = t.id
  AND t.slug = 'provisioning-roadmap'
  AND e.entry_key = v.entry_key;

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
  NULL,
  v.dot_position,
  v.order_index,
  'ai-products',
  v.entry_key
FROM public.timelines AS t
CROSS JOIN (
  VALUES
    (
      'Deep Research / Technical investigations',
      'Technical investigations',
      'Investigation assistant for incidents and technical questions; people review findings before writeback.',
      66,
      2,
      'deep-research'
    ),
    (
      'Agentic Application OS Platform',
      'Application OS',
      'The agentic application OS I stewarded: the shell where governed agents and apps run.',
      86,
      4,
      'iris-os'
    )
) AS v(label, phase, summary, dot_position, order_index, entry_key)
WHERE t.slug = 'provisioning-roadmap'
  AND NOT EXISTS (
    SELECT 1
    FROM public.timeline_entries AS existing
    WHERE existing.timeline_id = t.id
      AND existing.entry_key = v.entry_key
  );
