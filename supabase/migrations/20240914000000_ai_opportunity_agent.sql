-- ============================================================
-- MIGRATION: AI Opportunity Agent Extensions
-- Supports Scout, Profile Insights, Recommendation Feedback,
-- Evidence Links, and Canonical Opportunity Discovery Fields.
-- ============================================================

-- 1. Extend profiles with goals, preferences, and public proof
alter table profiles add column if not exists github_url text;
alter table profiles add column if not exists linkedin_url text;
alter table profiles add column if not exists portfolio_url text;
alter table profiles add column if not exists other_links text[] default '{}';
alter table profiles add column if not exists target_roles text[] default '{}';
alter table profiles add column if not exists target_industries text[] default '{}';
alter table profiles add column if not exists preferred_countries text[] default '{}';
alter table profiles add column if not exists willing_to_relocate boolean default false;
alter table profiles add column if not exists willing_to_travel boolean default true;
alter table profiles add column if not exists paid_only_preference boolean default false;
alter table profiles add column if not exists time_availability text;
alter table profiles add column if not exists effort_tolerance text check (effort_tolerance in ('quick', 'moderate', 'significant'));

-- 2. Extend opportunities with discovery, edition, and ranking fields
alter table opportunities add column if not exists official_url text;
alter table opportunities add column if not exists discovered_url text;
alter table opportunities add column if not exists source_evidence text;
alter table opportunities add column if not exists application_effort text check (application_effort in ('quick', 'moderate', 'significant'));
alter table opportunities add column if not exists topics text[] default '{}';
alter table opportunities add column if not exists skills text[] default '{}';
alter table opportunities add column if not exists education_stages text[] default '{}';
alter table opportunities add column if not exists citizenship_constraints text[] default '{}';
alter table opportunities add column if not exists residency_constraints text[] default '{}';
alter table opportunities add column if not exists edition_year integer;
alter table opportunities add column if not exists last_verified_at timestamptz;
alter table opportunities add column if not exists source_changed_at timestamptz;

-- 3. Profile Insights table (AI Profile Analysis)
create table if not exists profile_insights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  profile_version_ts timestamptz not null default now(),
  strongest_signals text[] default '{}',
  differentiators text[] default '{}',
  weak_signals text[] default '{}',
  likely_unlocks text[] default '{}',
  suggested_actions text[] default '{}',
  actionable_gaps jsonb default '[]'::jsonb,
  summary text,
  created_at timestamptz default now()
);

alter table profile_insights enable row level security;

drop policy if exists "profile_insights_own" on profile_insights;
create policy "profile_insights_own" on profile_insights
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Scout Runs table (Search History & Telemetry)
create table if not exists scout_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  query_text text not null,
  structured_query jsonb not null default '{}'::jsonb,
  result_count integer default 0,
  status text check (status in ('completed', 'failed', 'running')) default 'completed',
  error text,
  created_at timestamptz default now()
);

alter table scout_runs enable row level security;

drop policy if exists "scout_runs_own" on scout_runs;
create policy "scout_runs_own" on scout_runs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Saved Searches table
create table if not exists saved_searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  query_text text not null,
  structured_query jsonb not null default '{}'::jsonb,
  notify_new_matches boolean default false,
  created_at timestamptz default now()
);

alter table saved_searches enable row level security;

drop policy if exists "saved_searches_own" on saved_searches;
create policy "saved_searches_own" on saved_searches
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Recommendation Feedback table (For You & Ranking tuning)
create table if not exists recommendation_feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  action text not null check (action in ('interested', 'not_interested', 'not_relevant', 'already_knew', 'not_eligible', 'applied', 'hide')),
  reason text,
  created_at timestamptz default now()
);

alter table recommendation_feedback enable row level security;

drop policy if exists "feedback_own" on recommendation_feedback;
create policy "feedback_own" on recommendation_feedback
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. Application Evidence Links table (Tagging projects/achievements to application questions)
create table if not exists application_evidence_links (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references applications(id) on delete cascade,
  evidence_id uuid not null references profile_evidence(id) on delete cascade,
  question_key text,
  notes text,
  created_at timestamptz default now()
);

alter table application_evidence_links enable row level security;

drop policy if exists "evidence_links_own" on application_evidence_links;
create policy "evidence_links_own" on application_evidence_links
  for all using (
    application_id in (select id from applications where user_id = auth.uid())
  ) with check (
    application_id in (select id from applications where user_id = auth.uid())
  );
