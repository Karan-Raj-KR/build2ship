-- ============================================================
-- OPPORTUNITY WORKSPACE — Initial Schema Migration
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text,
  country_of_residence  text,
  nationalities         text[] default '{}',
  university            text,
  degree                text,
  field_of_study        text,
  education_stage       text check (education_stage in ('undergraduate', 'masters', 'phd', 'other')),
  expected_graduation   date,
  skills                text[] default '{}',
  interests             text[] default '{}',
  opportunity_types     text[] default '{}',
  participation_preference text check (participation_preference in ('remote', 'in-person', 'both')),
  travel_constraints    text,
  max_budget_amount     numeric,
  max_budget_currency   text,
  age_band              text,
  onboarding_completed  boolean default false,
  updated_at            timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

create policy "profiles_delete_own" on profiles
  for delete using (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, updated_at)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), now())
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- PROFILE EVIDENCE
-- ============================================================
create table if not exists profile_evidence (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  kind          text not null check (kind in ('project', 'achievement', 'experience', 'fact')),
  title         text not null,
  description   text,
  start_date    date,
  end_date      date,
  tags          text[] default '{}',
  evidence_url  text,
  confirmed     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table profile_evidence enable row level security;

create policy "evidence_select_own" on profile_evidence
  for select using (auth.uid() = user_id);

create policy "evidence_insert_own" on profile_evidence
  for insert with check (auth.uid() = user_id);

create policy "evidence_update_own" on profile_evidence
  for update using (auth.uid() = user_id);

create policy "evidence_delete_own" on profile_evidence
  for delete using (auth.uid() = user_id);

-- ============================================================
-- OPPORTUNITIES
-- ============================================================
create table if not exists opportunities (
  id                  uuid primary key default uuid_generate_v4(),
  created_by          uuid references auth.users(id),
  title               text not null,
  organizer           text,
  category            text check (category in ('hackathon', 'fellowship', 'scholarship', 'internship', 'grant', 'other')),
  summary             text,
  source_url          text,
  location            text,
  participation_mode  text check (participation_mode in ('remote', 'in-person', 'hybrid')),
  funding_description text,
  funding_kind        text check (funding_kind in ('prize', 'stipend', 'reimbursement', 'cost', 'none', 'unknown')),
  deadline            timestamptz,
  timezone_known      boolean default false,
  source_content      text,
  retrieved_at        timestamptz,
  source_status       text default 'unknown' check (source_status in ('live', 'unknown', 'closed')),
  requirements        jsonb,
  status              text default 'draft' check (status in ('draft', 'published')),
  is_demo             boolean default false,
  updated_at          timestamptz default now()
);

alter table opportunities enable row level security;

-- Published opportunities readable by all authenticated users
create policy "opportunities_select_published" on opportunities
  for select to authenticated using (status = 'published');

-- Creators can select their own drafts
create policy "opportunities_select_own_drafts" on opportunities
  for select using (auth.uid() = created_by);

-- Only backend/service role can insert/update/delete (admins use service key)
-- Ordinary users cannot publish; we rely on the status check constraint for now

-- ============================================================
-- APPLICATIONS
-- ============================================================
create table if not exists applications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  opportunity_id  uuid not null references opportunities(id) on delete restrict,
  stage           text not null default 'saved' check (stage in ('saved', 'preparing', 'submitted', 'selected', 'rejected', 'withdrawn')),
  next_action     text,
  target_date     date,
  notes           text,
  submitted_at    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, opportunity_id)
);

alter table applications enable row level security;

create policy "applications_select_own" on applications
  for select using (auth.uid() = user_id);

create policy "applications_insert_own" on applications
  for insert with check (auth.uid() = user_id);

create policy "applications_update_own" on applications
  for update using (auth.uid() = user_id);

create policy "applications_delete_own" on applications
  for delete using (auth.uid() = user_id);

-- ============================================================
-- APPLICATION TASKS
-- ============================================================
create table if not exists application_tasks (
  id              uuid primary key default uuid_generate_v4(),
  application_id  uuid not null references applications(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  title           text not null,
  completed       boolean default false,
  due_date        date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table application_tasks enable row level security;

create policy "tasks_select_own" on application_tasks
  for select using (auth.uid() = user_id);

create policy "tasks_insert_own" on application_tasks
  for insert with check (auth.uid() = user_id);

create policy "tasks_update_own" on application_tasks
  for update using (auth.uid() = user_id);

create policy "tasks_delete_own" on application_tasks
  for delete using (auth.uid() = user_id);

-- ============================================================
-- APPLICATION ANSWERS
-- ============================================================
create table if not exists application_answers (
  id              uuid primary key default uuid_generate_v4(),
  application_id  uuid not null references applications(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  question        text not null,
  answer_draft    text,
  evidence_ids    uuid[] default '{}',
  revised_at      timestamptz default now(),
  created_at      timestamptz default now()
);

alter table application_answers enable row level security;

create policy "answers_select_own" on application_answers
  for select using (auth.uid() = user_id);

create policy "answers_insert_own" on application_answers
  for insert with check (auth.uid() = user_id);

create policy "answers_update_own" on application_answers
  for update using (auth.uid() = user_id);

create policy "answers_delete_own" on application_answers
  for delete using (auth.uid() = user_id);

-- ============================================================
-- ANALYSIS RECORDS (reserved for Prompt 2)
-- ============================================================
create table if not exists analysis_records (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references profiles(id) on delete cascade,
  opportunity_id        uuid not null references opportunities(id) on delete cascade,
  opportunity_version_ts timestamptz,
  profile_updated_at    timestamptz,
  result                jsonb,
  created_at            timestamptz default now()
);

alter table analysis_records enable row level security;

create policy "analysis_select_own" on analysis_records
  for select using (auth.uid() = user_id);

create policy "analysis_insert_own" on analysis_records
  for insert with check (auth.uid() = user_id);
