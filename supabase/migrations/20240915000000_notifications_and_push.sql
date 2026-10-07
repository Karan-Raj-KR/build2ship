-- ============================================================
-- MIGRATION: Notifications, Preferences & Web Push Subscriptions
-- Enables in-app notification center, user notification preferences,
-- and web push subscription management.
-- ============================================================

-- 1. In-App User Notifications
create table if not exists user_notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null check (type in ('new_match', 'deadline', 'change', 'scout', 'application')),
  link_url text,
  is_read boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user_created 
  on user_notifications(user_id, created_at desc);

create index if not exists idx_user_notifications_user_unread 
  on user_notifications(user_id) where is_read = false;

alter table user_notifications enable row level security;

drop policy if exists "user_notifications_own" on user_notifications;
create policy "user_notifications_own" on user_notifications
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Notification Preferences
create table if not exists notification_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  frequency text not null default 'instant' check (frequency in ('instant', 'daily', 'weekly')),
  timezone text not null default 'UTC',
  quiet_hours_start text,
  quiet_hours_end text,
  deadline_reminder_days integer[] default '{7, 3, 1}',
  updated_at timestamptz not null default now()
);

alter table notification_preferences enable row level security;

drop policy if exists "notification_preferences_own" on notification_preferences;
create policy "notification_preferences_own" on notification_preferences
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Web Push Subscriptions
create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user 
  on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_own" on push_subscriptions;
create policy "push_subscriptions_own" on push_subscriptions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
