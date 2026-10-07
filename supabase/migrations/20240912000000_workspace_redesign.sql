-- Personal workspace ordering, pins, collections, focus, and durable milestones.
-- All records are private to the authenticated owner.

alter table applications add column if not exists sort_order bigint not null default 0;
alter table application_tasks add column if not exists sort_order bigint not null default 0;
alter table application_tasks add column if not exists pinned_to_today boolean not null default false;
alter table application_tasks add column if not exists source_required boolean not null default false;

with ranked as (
  select id, row_number() over (partition by user_id, stage order by updated_at desc, id) * 100 as position from applications
) update applications set sort_order = ranked.position from ranked where applications.id = ranked.id and applications.sort_order = 0;

with ranked as (
  select id, row_number() over (partition by application_id order by created_at, id) * 100 as position from application_tasks
) update application_tasks set sort_order = ranked.position from ranked where application_tasks.id = ranked.id and application_tasks.sort_order = 0;

create table if not exists opportunity_collections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists opportunity_collection_items (
  collection_id uuid not null references opportunity_collections(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, application_id)
);

create table if not exists workspace_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  weekly_focus text,
  celebrations_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists workspace_milestones (
  user_id uuid not null references profiles(id) on delete cascade,
  milestone text not null check (milestone in ('first_saved', 'first_eligibility_review', 'first_prepared', 'first_submitted')),
  achieved_at timestamptz not null default now(),
  primary key (user_id, milestone)
);

alter table opportunity_collections enable row level security;
alter table opportunity_collection_items enable row level security;
alter table workspace_preferences enable row level security;
alter table workspace_milestones enable row level security;

create policy "collections_own" on opportunity_collections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "collection_items_own" on opportunity_collection_items for all
  using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and exists (select 1 from opportunity_collections c where c.id = collection_id and c.user_id = auth.uid())
    and exists (select 1 from applications a where a.id = application_id and a.user_id = auth.uid())
  );
create policy "workspace_preferences_own" on workspace_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workspace_milestones_own" on workspace_milestones for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists applications_user_stage_order on applications (user_id, stage, sort_order);
create index if not exists application_tasks_user_pinned_order on application_tasks (user_id, pinned_to_today, sort_order);
