-- ============================================================
-- MIGRATION: Global Opportunity Catalogue, Admin Roles & Ops
-- Adds 12 global categories, country eligibility, visa requirements,
-- recurring schedule fields, admin audit logs, source registry,
-- quality queue, and system settings tables.
-- ============================================================

-- 1. Extend opportunities with global catalogue and quality fields
alter table opportunities drop constraint if exists opportunities_category_check;
alter table opportunities add column if not exists benefits text[] default '{}';
alter table opportunities add column if not exists eligible_countries text[] default '{}';
alter table opportunities add column if not exists visa_requirements text;
alter table opportunities add column if not exists is_recurring boolean default false;
alter table opportunities add column if not exists recurring_cycle text;
alter table opportunities add column if not exists publication_status text default 'published' check (publication_status in ('published', 'draft', 'archived'));
alter table opportunities add column if not exists is_featured boolean default false;
alter table opportunities add column if not exists quality_flags jsonb default '{}'::jsonb;

-- Indexes for performant global catalogue filtering and country lookups
create index if not exists idx_opportunities_category on opportunities(category);
create index if not exists idx_opportunities_deadline on opportunities(deadline);
create index if not exists idx_opportunities_status on opportunities(status);
create index if not exists idx_opportunities_publication_status on opportunities(publication_status);
create index if not exists idx_opportunities_eligible_countries on opportunities using gin(eligible_countries);
create index if not exists idx_opportunities_topics on opportunities using gin(topics);
create index if not exists idx_opportunities_skills on opportunities using gin(skills);

-- 2. Extend profiles with role, work authorizations, and suspension status
alter table profiles add column if not exists role text default 'user' check (role in ('owner', 'admin', 'editor', 'user'));
alter table profiles add column if not exists work_authorizations text[] default '{}';
alter table profiles add column if not exists is_suspended boolean default false;

-- Sync is_admin with role
update profiles set role = 'admin' where is_admin = true and (role is null or role = 'user');
update profiles set is_admin = true where role in ('owner', 'admin');

-- 3. Admin Audit Logs table
create table if not exists admin_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  admin_email text not null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamptz default now()
);

alter table admin_audit_logs enable row level security;

-- Audit logs policies
drop policy if exists "admin_audit_logs_select" on admin_audit_logs;
create policy "admin_audit_logs_select" on admin_audit_logs
  for select to authenticated
  using (auth.uid() in (select id from profiles where is_admin = true or role in ('owner', 'admin')));

drop policy if exists "admin_audit_logs_insert" on admin_audit_logs;
create policy "admin_audit_logs_insert" on admin_audit_logs
  for insert to authenticated
  with check (auth.uid() in (select id from profiles where is_admin = true or role in ('owner', 'admin', 'editor')));

-- 4. Admin Source Registry table
create table if not exists admin_sources (
  id text primary key,
  name text not null,
  type text not null default 'official_feed',
  official_domain text not null,
  category text not null,
  country text default 'GLOBAL',
  default_mode text default 'remote',
  is_verified boolean default true,
  is_enabled boolean default true,
  refresh_interval_days integer default 7,
  last_run_at timestamptz,
  last_status text default 'healthy',
  error_count integer default 0,
  last_error text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table admin_sources enable row level security;

drop policy if exists "admin_sources_select" on admin_sources;
create policy "admin_sources_select" on admin_sources
  for select to authenticated
  using (true);

drop policy if exists "admin_sources_mutate" on admin_sources;
create policy "admin_sources_mutate" on admin_sources
  for all to authenticated
  using (auth.uid() in (select id from profiles where is_admin = true or role in ('owner', 'admin')));

-- 5. System Settings & Feature Flags table
create table if not exists system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

alter table system_settings enable row level security;

drop policy if exists "system_settings_select" on system_settings;
create policy "system_settings_select" on system_settings
  for select to authenticated
  using (true);

drop policy if exists "system_settings_mutate" on system_settings;
create policy "system_settings_mutate" on system_settings
  for all to authenticated
  using (auth.uid() in (select id from profiles where is_admin = true or role in ('owner', 'admin')));

-- 6. Quality Reports Queue table
create table if not exists quality_reports (
  id uuid primary key default uuid_generate_v4(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  type text not null check (type in ('stale', 'broken_link', 'uncertain_extraction', 'conflicting_evidence', 'user_report')),
  details text,
  status text default 'pending' check (status in ('pending', 'resolved', 'ignored')),
  created_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

alter table quality_reports enable row level security;

drop policy if exists "quality_reports_select" on quality_reports;
create policy "quality_reports_select" on quality_reports
  for select to authenticated
  using (auth.uid() in (select id from profiles where is_admin = true or role in ('owner', 'admin', 'editor')));

drop policy if exists "quality_reports_mutate" on quality_reports;
create policy "quality_reports_mutate" on quality_reports
  for all to authenticated
  using (auth.uid() in (select id from profiles where is_admin = true or role in ('owner', 'admin', 'editor')));
