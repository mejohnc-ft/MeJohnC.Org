-- Public Results cards: recruiter-safe copy for the Work tab.
-- Updates the three live case_studies rows and inserts the +133% lead card.
-- Does not change RLS or table shape. Idempotent by id.

CREATE TEMP TABLE _public_case_studies_seed (
  id uuid PRIMARY KEY,
  metric text NOT NULL,
  title text NOT NULL,
  before_content text NOT NULL,
  after_content text NOT NULL,
  order_index integer NOT NULL
);

INSERT INTO _public_case_studies_seed (
  id,
  metric,
  title,
  before_content,
  after_content,
  order_index
) VALUES
  (
    '6f2c8a91-4d3e-4b7a-9c15-8e0a1f3b5d72',
    '+133%',
    'Automation hours, same billed labor',
    'More automations used to mean more engineer hours. The desk was already busy.',
    'Governed automations and agents carry the extra load. Automation hours are up 133% while billed hours stayed essentially flat. Humans still approve writeback and anything that spends money.',
    0
  ),
  (
    'a235ceb3-0933-4df8-b356-628342ddbaa4',
    '2 min',
    'User provisioning',
    'A fresh machine was 45 minutes of manual onboarding, config, and babysitting.',
    'Plug in, run the playbook, QC. About two minutes. Immy.Bot and Rewst are the stack; people still do the check.',
    1
  ),
  (
    '5eeee2cc-d732-434e-b24f-8c60eebc365b',
    'clean',
    'Inventory billing',
    'Month-end billing lived in Excel. Fields were optional, access was whoever had the file, and a missed row meant a missed invoice.',
    'A governed SharePoint list with required fields and role-based access. The close is a process, not a hunt through a spreadsheet.',
    2
  ),
  (
    '3cc0a438-7630-4858-8df9-fca25e126962',
    '50%',
    'Faster inventory updates',
    'Finding a device meant hunting through SharePoint folders.',
    'A three-digit lookup in Teams. Half the time.',
    3
  );

UPDATE public.case_studies AS live
SET
  metric = seed.metric,
  title = seed.title,
  before_content = seed.before_content,
  after_content = seed.after_content,
  order_index = seed.order_index,
  updated_at = now()
FROM _public_case_studies_seed AS seed
WHERE live.id = seed.id;

DO $$
DECLARE
  has_tenant boolean;
  existing_tenant uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'case_studies'
      AND column_name = 'tenant_id'
  ) INTO has_tenant;

  IF has_tenant THEN
    SELECT tenant_id INTO existing_tenant
    FROM public.case_studies
    WHERE id IN (
      'a235ceb3-0933-4df8-b356-628342ddbaa4',
      '5eeee2cc-d732-434e-b24f-8c60eebc365b',
      '3cc0a438-7630-4858-8df9-fca25e126962',
      '6f2c8a91-4d3e-4b7a-9c15-8e0a1f3b5d72'
    )
    LIMIT 1;

    existing_tenant := COALESCE(
      existing_tenant,
      '00000000-0000-0000-0000-000000000001'::uuid
    );

    INSERT INTO public.case_studies (
      id,
      tenant_id,
      metric,
      title,
      before_content,
      after_content,
      order_index
    )
    SELECT
      seed.id,
      existing_tenant,
      seed.metric,
      seed.title,
      seed.before_content,
      seed.after_content,
      seed.order_index
    FROM _public_case_studies_seed AS seed
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.case_studies AS live
      WHERE live.id = seed.id
    );
  ELSE
    INSERT INTO public.case_studies (
      id,
      metric,
      title,
      before_content,
      after_content,
      order_index
    )
    SELECT
      seed.id,
      seed.metric,
      seed.title,
      seed.before_content,
      seed.after_content,
      seed.order_index
    FROM _public_case_studies_seed AS seed
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.case_studies AS live
      WHERE live.id = seed.id
    );
  END IF;
END $$;

DROP TABLE _public_case_studies_seed;
