-- Source review: 2026-10-06. Public catalogue corrections only; no user work is deleted.
-- Apply on QA first. Preserve a preimage/export or restore branch before production.
BEGIN;
UPDATE public.opportunities SET title='The Thiel Fellowship', edition_year=NULL,
  summary='A two-year grant for young people building a venture or project. Recipients leave college to accept the fellowship.',
  funding_description='USD 250,000 over two years. The foundation takes no equity.',
  funding_amount_min=250000, funding_amount_max=250000, funding_currency='USD', funding_kind='stipend',
  deadline=NULL, deadline_raw_text='Applications accepted year round', deadline_timezone=NULL,
  timezone_known=false, deadline_timezone_known=false, is_recurring=true, recurring_cycle='Rolling applications',
  official_url='https://thielfellowship.org/faq', source_url='https://thielfellowship.org/faq',
  source_evidence='Reviewed the official FAQ on 6 October 2026: applicants must be at most 22, have no university degree, and demonstrate progress toward a concrete vision. Recipients must leave school. Applications are year round; the grant is USD 250,000 over two years without equity.',
  requirements='{"items":[{"text":"Age 22 or younger when applying","type":"age","mandatory":"mandatory","excerpt":"Aged 22 or younger","source_ref":"https://thielfellowship.org/faq","comparison_rule":{"field":"age","operator":"lte","value":22}},{"text":"Must not already hold a university degree","type":"education_stage","mandatory":"mandatory","source_ref":"https://thielfellowship.org/faq","comparison_rule":null},{"text":"Must demonstrate meaningful progress on a concrete project or vision","type":"experience","mandatory":"mandatory","source_ref":"https://thielfellowship.org/faq","comparison_rule":null},{"text":"Must leave college to accept the fellowship if selected","type":"other","mandatory":"mandatory","source_ref":"https://thielfellowship.org/faq","comparison_rule":null}]}'::jsonb,
  citizenship_constraints='{}', residency_constraints='{}', eligible_countries='{}', education_stages='{}',
  source_status='live', last_verified_at='2026-10-06T05:58:17Z', updated_at=now()
WHERE id='c1000000-0000-4000-8000-000000000004';

-- The official portal explicitly closes the 2026-27 intake. Exact deadline
-- timezone is not published in the reviewed page; do not invent a UTC cutoff.
UPDATE public.opportunities SET status='archived',publication_status='archived',source_status='closed',
  official_url='https://www.sbiashascholarship.co.in/',
  source_evidence='Official SBI portal reviewed 6 October 2026 states applications for 2026-27 are closed and identifies 19 September 2026 as the last date. The displayed time has no timezone; no precise UTC deadline has been assigned.',
  last_verified_at='2026-10-06T05:58:17Z',updated_at=now()
WHERE id='97f8c916-a752-4175-826e-8e2b55051812';

-- Provider pages now advertise newer editions; archive the obsolete edition
-- instead of silently changing its identity underneath saved applications.
UPDATE public.opportunities SET status='archived',publication_status='archived',source_status='closed',
  source_evidence='Provider page reviewed 6 October 2026 advertises Cal Hacks 13.0. This stored 12.0 edition is obsolete; its guessed deadline is removed.',
  deadline=NULL,timezone_known=false,deadline_timezone_known=false,
  last_verified_at='2026-10-06T05:58:17Z',updated_at=now()
WHERE id='c1000000-0000-4000-8000-000000000012';
UPDATE public.opportunities SET status='archived',publication_status='archived',source_status='closed',
  source_evidence='Provider page reviewed 6 October 2026 advertises PennApps XXVII, with applications opening later in October. This stored XXVI edition is obsolete; its guessed deadline is removed.',
  deadline=NULL,timezone_known=false,deadline_timezone_known=false,
  last_verified_at='2026-10-06T05:58:17Z',updated_at=now()
WHERE id='c1000000-0000-4000-8000-000000000041';
COMMIT;
