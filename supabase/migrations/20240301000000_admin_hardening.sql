-- ============================================================
-- MIGRATION: Admin RLS hardening and imported_opportunities table
-- ============================================================

-- ============================================================
-- IMPORTED OPPORTUNITIES (Prompt 2 data model)
-- ============================================================
create table if not exists imported_opportunities (
  id                    uuid primary key default uuid_generate_v4(),
  created_by            uuid not null references auth.users(id),
  title                 text not null,
  organizer             text,
  category              text not null check (category in ('hackathon', 'fellowship', 'scholarship', 'internship', 'grant', 'other')),
  summary               text not null,
  location              text,
  participation_mode    text not null check (participation_mode in ('remote', 'in-person', 'hybrid')),
  deadline              timestamptz,
  deadline_timezone     text,
  deadline_timezone_known boolean default false,
  deadline_raw_text     text,
  funding_kind          text not null check (funding_kind in ('prize', 'stipend', 'reimbursement', 'cost', 'none', 'unknown')),
  funding_description   text not null default '',
  funding_amount_min    integer,
  funding_amount_max    integer,
  funding_currency      text,
  funding_conditional   boolean default false,
  requirements          jsonb default '[]'::jsonb,
  application_questions text[] default '{}',
  required_documents    text[] default '{}',
  application_steps     text[] default '{}',
  source_url            text,
  source_content        text not null default '',
  source_label          text not null check (source_label in ('fetched', 'user_provided')),
  source_status         text not null default 'unknown' check (source_status in ('live', 'unknown', 'closed')),
  extracted_at          timestamptz not null default now(),
  status                text not null default 'draft' check (status in ('draft', 'published')),
  is_demo               boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table imported_opportunities enable row level security;

-- Published imported opportunities readable by all authenticated users
create policy "imported_opps_select_published" on imported_opportunities
  for select to authenticated using (status = 'published');

-- Creators can read their own drafts
create policy "imported_opps_select_own_drafts" on imported_opportunities
  for select using (auth.uid() = created_by);

-- Creators can insert their own
create policy "imported_opps_insert_own" on imported_opportunities
  for insert with check (auth.uid() = created_by);

-- Creators can update their own
create policy "imported_opps_update_own" on imported_opportunities
  for update using (auth.uid() = created_by);

-- ============================================================
-- HARDEN admin flag — prevent self-promotion via client
-- ============================================================

-- Drop the permissive update policy
drop policy if exists "profiles_update_own" on profiles;

-- Re-create with admin flag protection:
-- Users can update their own profile, but cannot set is_admin
create policy "profiles_update_own" on profiles
  for update using (
    auth.uid() = id
    and (
      -- Allow if is_admin is not being changed
      (current_setting('request.jwt.claims', true)::json->>'role') is not null
      or is_admin is not true
    )
  );

-- Safer approach: use a trigger to prevent self-admin promotion
create or replace function prevent_admin_self_promotion()
returns trigger language plpgsql as $$
begin
  if NEW.is_admin is distinct from OLD.is_admin and NEW.is_admin = true then
    raise exception 'Cannot self-promote to admin';
  end if;
  return NEW;
end;
$$;

-- Drop existing trigger if present and recreate
drop trigger if exists prevent_admin_promotion on profiles;
create trigger prevent_admin_promotion
  before update on profiles
  for each row execute function prevent_admin_self_promotion();
