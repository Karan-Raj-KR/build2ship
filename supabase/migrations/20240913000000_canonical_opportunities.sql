-- ============================================================
-- MIGRATION: Canonical Opportunity Model, RLS Hardening, and Curated Seed
-- Unifies imported and curated opportunities into the canonical `opportunities` entity.
-- All applications and analyses reference `opportunities(id)`.
-- ============================================================

-- 1. Extend `opportunities` table with canonical metadata fields
alter table opportunities add column if not exists source_label text default 'curated' check (source_label in ('curated', 'fetched', 'user_provided', 'seed'));
alter table opportunities add column if not exists deadline_timezone text;
alter table opportunities add column if not exists deadline_timezone_known boolean default false;
alter table opportunities add column if not exists deadline_raw_text text;
alter table opportunities add column if not exists funding_amount_min integer;
alter table opportunities add column if not exists funding_amount_max integer;
alter table opportunities add column if not exists funding_currency text;
alter table opportunities add column if not exists funding_conditional boolean default false;
alter table opportunities add column if not exists application_questions text[] default '{}';
alter table opportunities add column if not exists required_documents text[] default '{}';
alter table opportunities add column if not exists application_steps text[] default '{}';
alter table opportunities add column if not exists created_at timestamptz default now();

-- 2. Migrate any existing data from legacy `imported_opportunities` table into `opportunities`
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'imported_opportunities' and table_type = 'BASE TABLE'
  ) then
    insert into opportunities (
      id, created_by, title, organizer, category, summary, location, participation_mode,
      deadline, deadline_timezone, timezone_known, deadline_raw_text,
      funding_kind, funding_description, funding_amount_min, funding_amount_max, funding_currency, funding_conditional,
      requirements, application_questions, required_documents, application_steps,
      source_url, source_content, source_label, source_status, status, is_demo, created_at, updated_at
    )
    select
      id, created_by, title, organizer, category, summary, location, participation_mode,
      deadline, deadline_timezone, deadline_timezone_known, deadline_raw_text,
      funding_kind, funding_description, funding_amount_min, funding_amount_max, funding_currency, funding_conditional,
      requirements, application_questions, required_documents, application_steps,
      source_url, source_content, source_label, source_status, status, is_demo, created_at, updated_at
    from imported_opportunities
    on conflict (id) do update set
      title = excluded.title,
      status = excluded.status,
      updated_at = excluded.updated_at;

    -- Drop legacy base table and replace with view
    drop table imported_opportunities cascade;
  end if;
end $$;

-- 3. Backward-compatible view for imported_opportunities
create or replace view imported_opportunities as
  select * from opportunities where source_label in ('fetched', 'user_provided');

-- 4. RLS Policies on `opportunities`
alter table opportunities enable row level security;

drop policy if exists "opportunities_select_published" on opportunities;
create policy "opportunities_select_published" on opportunities
  for select using (status = 'published');

drop policy if exists "opportunities_select_own_drafts" on opportunities;
drop policy if exists "opportunities_select_own" on opportunities;
create policy "opportunities_select_own" on opportunities
  for select using (auth.uid() = created_by);

drop policy if exists "opportunities_insert_own" on opportunities;
create policy "opportunities_insert_own" on opportunities
  for insert with check (auth.uid() = created_by or created_by is null);

drop policy if exists "opportunities_update_own" on opportunities;
create policy "opportunities_update_own" on opportunities
  for update using (auth.uid() = created_by or auth.uid() in (select id from profiles where is_admin = true));

-- 5. RLS Policies on `analysis_records`
alter table analysis_records enable row level security;

drop policy if exists "analysis_select_own" on analysis_records;
create policy "analysis_select_own" on analysis_records
  for select using (auth.uid() = user_id);

drop policy if exists "analysis_insert_own" on analysis_records;
create policy "analysis_insert_own" on analysis_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "analysis_update_own" on analysis_records;
create policy "analysis_update_own" on analysis_records
  for update using (auth.uid() = user_id);

drop policy if exists "analysis_delete_own" on analysis_records;
create policy "analysis_delete_own" on analysis_records
  for delete using (auth.uid() = user_id);

-- 6. Safe Service-Role Policies for Payments and Analytics (Fix missing TO service_role)
drop policy if exists "Service role full access on payment_passes" on payment_passes;
create policy "Service role full access on payment_passes"
  on payment_passes for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role full access on ai_usage" on ai_usage;
create policy "Service role full access on ai_usage"
  on ai_usage for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role full access on analytics_events" on analytics_events;
create policy "Service role full access on analytics_events"
  on analytics_events for all
  to service_role
  using (true)
  with check (true);

-- Allow authenticated users to insert their own ai_usage and analytics events
drop policy if exists "Users can insert own AI usage" on ai_usage;
create policy "Users can insert own AI usage"
  on ai_usage for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own analytics events" on analytics_events;
create policy "Users can insert own analytics events"
  on analytics_events for insert
  with check (auth.uid() = user_id);

-- 7. Idempotently seed curated real 2026 opportunities into canonical `opportunities` table
insert into opportunities (
  id, created_by, title, organizer, category, summary, location, participation_mode,
  deadline, deadline_timezone, timezone_known, deadline_raw_text,
  funding_kind, funding_description, funding_amount_min, funding_amount_max, funding_currency, funding_conditional,
  requirements, application_questions, required_documents, application_steps,
  source_url, source_content, source_label, source_status, status, is_demo, created_at, updated_at
) values
(
  'c1000000-0000-4000-8000-000000000001',
  null,
  'Google Summer of Code 2026',
  'Google Open Source',
  'internship',
  'A global program bringing new contributors into open source. Students work with an open source organization on a 3+ month programming project and receive a stipend upon successful completion.',
  'Remote',
  'remote',
  '2026-04-02T23:59:59Z',
  'UTC',
  true,
  'April 2, 2026',
  'stipend',
  'Stipend paid in phases based on project milestones. Amount varies by country.',
  1500,
  6000,
  'USD',
  false,
  '{"items": [{"text": "Must be 18 years or older", "type": "age", "mandatory": "mandatory", "excerpt": "You must be 18 years or older", "source_ref": "eligibility", "comparison_rule": {"field": "age", "operator": "gte", "value": 18}, "uncertainty": null}, {"text": "Must be enrolled in or accepted to a post-secondary institution", "type": "education_stage", "mandatory": "mandatory", "excerpt": "Must be enrolled in or accepted to a post-secondary academic program", "source_ref": "eligibility", "comparison_rule": {"field": "education_stage", "operator": "in_list", "value": ["undergraduate", "masters", "phd"]}, "uncertainty": null}, {"text": "Must be a confirmed student as of GSoC acceptance", "type": "education_stage", "mandatory": "mandatory", "excerpt": "You must be a student as of the GSoC acceptance announcement", "source_ref": "eligibility", "comparison_rule": null, "uncertainty": "Requires student status confirmation"}, {"text": "Must be able to work 175+ hours over 3 months", "type": "experience", "mandatory": "mandatory", "excerpt": "You should be prepared to work at least 175 hours on your project", "source_ref": "timeline", "comparison_rule": null, "uncertainty": null}, {"text": "Must have previous experience with version control (Git)", "type": "skill", "mandatory": "preferred", "excerpt": "Familiarity with Git and open source workflows", "source_ref": "requirements", "comparison_rule": {"field": "skill", "operator": "includes", "value": "git"}, "uncertainty": null}]}'::jsonb,
  array['Describe your interest in open source and this organization', 'What relevant programming experience do you have?', 'Why are you interested in this particular project?'],
  array['CV/Resume'],
  array['Find an organization and project idea', 'Contact the organization mentors', 'Submit proposal via GSoC portal', 'Wait for acceptance decision'],
  'https://summerofcode.withgoogle.com/',
  'Google Summer of Code is a global program focused on bringing more developers into open source software development. Students work with an open source organization on a 3+ month programming project.',
  'curated',
  'live',
  'published',
  false,
  now() - interval '10 days',
  now()
),
(
  'c1000000-0000-4000-8000-000000000002',
  null,
  'Mitacs Globalink Research Internship 2026',
  'Mitacs',
  'internship',
  'A 12-week research internship for undergraduate students at Canadian universities. Work with a Canadian professor on a research project. Fully funded including airfare and stipend.',
  'Canada',
  'in-person',
  '2026-09-22T23:59:59Z',
  'UTC',
  true,
  'September 22, 2026',
  'stipend',
  'Round-trip airfare, stipend, and insurance covered by Mitacs.',
  3000,
  8000,
  'CAD',
  false,
  '{"items": [{"text": "Must be enrolled in an undergraduate program", "type": "education_stage", "mandatory": "mandatory", "excerpt": "Currently enrolled in a degree-granting program at an eligible university", "source_ref": "eligibility", "comparison_rule": {"field": "education_stage", "operator": "equals", "value": "undergraduate"}, "uncertainty": null}, {"text": "Must be at least 18 years of age", "type": "age", "mandatory": "mandatory", "excerpt": "At least 18 years of age", "source_ref": "eligibility", "comparison_rule": {"field": "age", "operator": "gte", "value": 18}, "uncertainty": null}, {"text": "Must have completed at least 2 years of university", "type": "education_stage", "mandatory": "mandatory", "excerpt": "Must have completed at least 2 full years of study", "source_ref": "eligibility", "comparison_rule": null, "uncertainty": "Requires verification of completed years"}, {"text": "Must have a valid passport", "type": "document", "mandatory": "mandatory", "excerpt": "A valid passport is required for travel", "source_ref": "documents", "comparison_rule": {"field": "document", "operator": "equals", "value": "valid passport"}, "uncertainty": null}]}'::jsonb,
  array['Why are you interested in this research internship?', 'Describe your research experience and interests', 'How does this internship align with your career goals?'],
  array['CV/Resume', 'Transcript', 'Two reference letters'],
  array['Browse available projects', 'Submit application through Mitacs portal', 'Interview with professor', 'Acceptance and travel arrangements'],
  'https://www.mitacs.ca/en/programs/globalink-research-internship',
  'Mitacs Globalink Research Internship offers 12-week research internships for undergraduate students at Canadian universities. The program covers round-trip airfare, stipend, and health insurance.',
  'curated',
  'live',
  'published',
  false,
  now() - interval '15 days',
  now()
),
(
  'c1000000-0000-4000-8000-000000000003',
  null,
  'HackMIT 2026',
  'MIT student volunteers',
  'hackathon',
  'One of the largest student-run hackathons in the US. 24 hours of building, learning, and innovating. Open to all college students worldwide.',
  'Cambridge, MA (hybrid)',
  'hybrid',
  '2026-09-14T23:59:59Z',
  'America/New_York',
  true,
  'September 14, 2026',
  'reimbursement',
  'Travel reimbursement available. Meals and snacks provided at venue.',
  100,
  500,
  'USD',
  true,
  '{"items": [{"text": "Must be a college/university student", "type": "education_stage", "mandatory": "mandatory", "excerpt": "Open to all college students", "source_ref": "eligibility", "comparison_rule": {"field": "education_stage", "operator": "in_list", "value": ["undergraduate", "masters", "phd"]}, "uncertainty": null}, {"text": "Must be 18 or older", "type": "age", "mandatory": "mandatory", "excerpt": "Must be 18 or older", "source_ref": "eligibility", "comparison_rule": {"field": "age", "operator": "gte", "value": 18}, "uncertainty": null}, {"text": "Teams of 1-4 people", "type": "team_size", "mandatory": "mandatory", "excerpt": "Teams of 1 to 4", "source_ref": "rules", "comparison_rule": {"field": "team_size", "operator": "lte", "value": 4}, "uncertainty": null}, {"text": "Must follow MLH Code of Conduct", "type": "other", "mandatory": "mandatory", "excerpt": "MLH Code of Conduct applies", "source_ref": "rules", "comparison_rule": null, "uncertainty": null}]}'::jsonb,
  array['What is the coolest project you have built?', 'Why do you want to attend HackMIT?'],
  array[]::text[],
  array['Register on HackMIT website', 'Form a team (or join solo)', 'Attend opening ceremony', 'Hack for 24 hours', 'Present and demo'],
  'https://hackmit.org/',
  'HackMIT is one of the premier hackathons in the US. 24-hour hackathon at MIT campus with hybrid participation option.',
  'curated',
  'live',
  'published',
  false,
  now() - interval '5 days',
  now()
),
(
  'c1000000-0000-4000-8000-000000000004',
  null,
  'Thiel Fellowship 2026',
  'Thiel Foundation',
  'grant',
  'A $100,000 grant for young people (under 23) who want to build new things instead of sitting in a classroom. Two-year fellowship with mentorship and network.',
  'Flexible',
  'remote',
  '2026-10-31T23:59:59Z',
  'UTC',
  true,
  'October 31, 2026',
  'stipend',
  '$100,000 paid in stages over two years. Additional mentorship and network access.',
  100000,
  100000,
  'USD',
  false,
  '{"items": [{"text": "Must be 22 years old or younger", "type": "age", "mandatory": "mandatory", "excerpt": "Under 23 years old", "source_ref": "eligibility", "comparison_rule": {"field": "age", "operator": "lte", "value": 22}, "uncertainty": null}, {"text": "Must have a venture or project in development", "type": "experience", "mandatory": "mandatory", "excerpt": "Must have a specific venture or project you are working on", "source_ref": "eligibility", "comparison_rule": null, "uncertainty": "Subjective evaluation"}, {"text": "Must be willing to drop out or take leave from formal education", "type": "other", "mandatory": "mandatory", "excerpt": "Must be willing to step away from traditional education", "source_ref": "commitment", "comparison_rule": null, "uncertainty": "Fellowship encourages but does not require dropping out"}]}'::jsonb,
  array['What are you building and why does it matter?', 'What makes you the right person to build this?', 'What is your unfair advantage?'],
  array['Project pitch/deck (optional)'],
  array['Submit application online', 'First round review', 'Interviews with Thiel team', 'Final decision'],
  'https://thielfellowship.org/',
  'The Thiel Fellowship gives $100,000 to young people who want to build new things. Fellows receive mentorship, a network, and funding.',
  'curated',
  'live',
  'published',
  false,
  now() - interval '20 days',
  now()
),
(
  'c1000000-0000-4000-8000-000000000005',
  null,
  'Girls Who Impact Grant 2026',
  'Girls Who Code',
  'grant',
  'Grants of up to $5,000 for women and non-binary students pursuing computer science projects, startups, or community initiatives.',
  'Remote',
  'remote',
  '2026-08-15T23:59:59Z',
  'UTC',
  true,
  'August 15, 2026',
  'stipend',
  'Up to $5,000 grant. No strings attached.',
  1000,
  5000,
  'USD',
  false,
  '{"items": [{"text": "Must identify as woman or non-binary", "type": "nationality", "mandatory": "mandatory", "excerpt": "For women and non-binary individuals", "source_ref": "eligibility", "comparison_rule": null, "uncertainty": "Self-identification based"}, {"text": "Must be a student (any level)", "type": "education_stage", "mandatory": "mandatory", "excerpt": "Must be currently enrolled as a student", "source_ref": "eligibility", "comparison_rule": {"field": "education_stage", "operator": "in_list", "value": ["undergraduate", "masters", "phd"]}, "uncertainty": null}, {"text": "Must be pursuing a CS-related project or initiative", "type": "field_of_study", "mandatory": "mandatory", "excerpt": "Computer science related project", "source_ref": "eligibility", "comparison_rule": {"field": "field_of_study", "operator": "includes", "value": "computer"}, "uncertainty": null}]}'::jsonb,
  array['Describe your project or initiative', 'How will the grant funds be used?', 'What impact do you hope to achieve?'],
  array['Project proposal', 'CV/Resume'],
  array['Submit application online', 'Review by selection committee', 'Notify winners', 'Disburse funds'],
  'https://girlswhocode.com/grants',
  'Girls Who Impact Grants provide funding to women and non-binary students working on CS projects.',
  'curated',
  'live',
  'published',
  false,
  now() - interval '8 days',
  now()
),
(
  'c1000000-0000-4000-8000-000000000006',
  null,
  'Machine Learning Group Research Placement 2026',
  'University of Oxford',
  'fellowship',
  'Paid 6-month research placement at the Oxford Machine Learning Group. Work on cutting-edge ML research with world-leading academics.',
  'Oxford, UK',
  'in-person',
  '2026-05-15T23:59:59Z',
  'Europe/London',
  true,
  'May 15, 2026',
  'stipend',
  'Monthly stipend of approximately £1,800. Travel and accommodation support.',
  10800,
  10800,
  'GBP',
  false,
  '{"items": [{"text": "Must be enrolled in a graduate program (Masters or PhD)", "type": "education_stage", "mandatory": "mandatory", "excerpt": "Graduate students preferred", "source_ref": "eligibility", "comparison_rule": {"field": "education_stage", "operator": "in_list", "value": ["masters", "phd"]}, "uncertainty": null}, {"text": "Strong background in machine learning", "type": "skill", "mandatory": "mandatory", "excerpt": "Strong ML background", "source_ref": "requirements", "comparison_rule": {"field": "skill", "operator": "includes", "value": "machine learning"}, "uncertainty": null}, {"text": "Experience with Python and ML frameworks", "type": "skill", "mandatory": "mandatory", "excerpt": "Python and ML frameworks", "source_ref": "requirements", "comparison_rule": {"field": "skill", "operator": "in_list", "value": ["python", "pytorch", "tensorflow"]}, "uncertainty": null}]}'::jsonb,
  array['Describe your ML research experience', 'Which ML topics interest you most?', 'What publications do you have (if any)?'],
  array['CV/Resume', 'Research statement', 'Two reference letters'],
  array['Email professor with expression of interest', 'Submit formal application', 'Interview with research group', 'Decision'],
  null,
  'Oxford ML Group research placement. 6-month paid position working on cutting-edge ML research.',
  'curated',
  'live',
  'published',
  false,
  now() - interval '12 days',
  now()
)
on conflict (id) do update set
  title = excluded.title,
  organizer = excluded.organizer,
  category = excluded.category,
  summary = excluded.summary,
  location = excluded.location,
  participation_mode = excluded.participation_mode,
  deadline = excluded.deadline,
  funding_kind = excluded.funding_kind,
  funding_description = excluded.funding_description,
  funding_amount_min = excluded.funding_amount_min,
  funding_amount_max = excluded.funding_amount_max,
  funding_currency = excluded.funding_currency,
  requirements = excluded.requirements,
  application_questions = excluded.application_questions,
  required_documents = excluded.required_documents,
  application_steps = excluded.application_steps,
  source_url = excluded.source_url,
  source_label = excluded.source_label,
  source_status = excluded.source_status,
  status = excluded.status,
  updated_at = now();
