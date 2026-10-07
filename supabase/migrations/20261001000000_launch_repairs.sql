-- Apply with the pending global/admin migration in ONE transaction. See LAUNCH_STATUS.md.
-- No catalogue rows are deleted or fabricated by this migration.
alter table opportunities add column if not exists source_type text;
alter table opportunities drop constraint if exists opportunities_status_check;
alter table opportunities add constraint opportunities_status_check check(status in ('draft','published','archived'));
update opportunities set publication_status = status where publication_status is distinct from status;

-- Only the service role may change authorization fields. Own-profile APIs never accept them.
create or replace function prevent_admin_self_promotion() returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if TG_OP = 'INSERT' then
      if NEW.is_admin or coalesce(NEW.role, 'user') <> 'user' or NEW.is_suspended then raise exception 'Privileged profile fields are server-managed'; end if;
    elsif NEW.is_admin is distinct from OLD.is_admin or NEW.role is distinct from OLD.role or NEW.is_suspended is distinct from OLD.is_suspended then
      raise exception 'Privileged profile fields are server-managed';
    end if;
  end if;
  return NEW;
end;
$$;
drop trigger if exists prevent_admin_promotion on profiles;
create trigger prevent_admin_promotion before insert or update on profiles for each row execute function prevent_admin_self_promotion();

-- Prevent suspended users from accessing owner-scoped data through direct REST calls.
create or replace function is_active_user() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and not coalesce(is_suspended,false));
$$;
revoke all on function is_active_user() from public;
grant execute on function is_active_user() to authenticated;

drop policy if exists opportunities_insert_own on opportunities;
create policy opportunities_insert_own on opportunities for insert to authenticated with check(created_by = auth.uid() and status = 'draft' and publication_status = 'draft' and last_verified_at is null and is_active_user());
drop policy if exists opportunities_update_own on opportunities;
create policy opportunities_update_own on opportunities for update to authenticated using(created_by = auth.uid() and status = 'draft' and is_active_user()) with check(created_by = auth.uid() and status = 'draft' and publication_status = 'draft' and last_verified_at is null and is_active_user());

-- Add a restrictive gate alongside existing own-row policies.
do $$ declare t text; begin
  foreach t in array array['profile_evidence','applications','application_tasks','application_answers','analysis_records','opportunity_collections','opportunity_collection_items','workspace_preferences','profile_insights','scout_runs','saved_searches','recommendation_feedback','user_notifications','notification_preferences','push_subscriptions'] loop
    execute format('drop policy if exists active_account on %I', t);
    execute format('create policy active_account on %I as restrictive for all to authenticated using (public.is_active_user()) with check (public.is_active_user())', t);
  end loop;
end $$;

-- A payment cannot grant access twice. Stop migration if legacy duplicates need reconciliation.
create unique index if not exists payment_passes_payment_unique on payment_passes(payment_id);
create unique index if not exists payment_passes_order_unique on payment_passes(order_id);
create table if not exists payment_orders (
  order_id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check(amount > 0), currency text not null, duration_days integer not null check(duration_days > 0),
  status text not null default 'created', payment_id text unique, created_at timestamptz not null default now()
);
alter table payment_orders enable row level security;
create policy payment_orders_read_own on payment_orders for select to authenticated using(user_id=auth.uid());

create or replace function grant_payment_access(p_order_id text, p_payment_id text) returns void language plpgsql security definer set search_path = public as $$
declare o payment_orders; begin
  select * into o from payment_orders where order_id=p_order_id for update;
  if not found then raise exception 'Unknown order'; end if;
  if o.status in ('refunded','revoked') then raise exception 'Payment access revoked'; end if;
  if o.status='paid' then
    if o.payment_id <> p_payment_id then raise exception 'Order already paid by another payment'; end if;
    return;
  end if;
  insert into payment_passes(user_id,payment_id,order_id,amount,currency,expires_at,status)
    values(o.user_id,p_payment_id,o.order_id,o.amount,o.currency,now()+make_interval(days=>o.duration_days),'active');
  update payment_orders set status='paid',payment_id=p_payment_id where order_id=o.order_id;
end $$;
revoke all on function grant_payment_access(text,text) from public,anon,authenticated;
grant execute on function grant_payment_access(text,text) to service_role;

-- Durable notification/email deduplication and retry.
alter table user_notifications add column if not exists event_key text;
create unique index if not exists notifications_event_unique on user_notifications(user_id,event_key);
alter table notification_preferences alter column email_enabled set default false;
alter table notification_preferences add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
create unique index if not exists preferences_unsubscribe_unique on notification_preferences(unsubscribe_token);
create table if not exists email_deliveries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null, recipient text not null, subject text not null, html text not null, body_text text not null,
  status text not null default 'pending' check(status in ('pending','sending','sent','failed','cancelled')),
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
  last_error text, provider_message_id text, sent_at timestamptz, created_at timestamptz not null default now(),
  unique(user_id,event_key)
);
alter table email_deliveries enable row level security;
create or replace function claim_email_batch() returns setof email_deliveries language sql security definer set search_path=public as $$
  update email_deliveries set status='sending', attempts=attempts+1, next_attempt_at=now()+interval '10 minutes'
  where id in (select id from email_deliveries where status in ('pending','failed','sending') and attempts<5 and next_attempt_at<=now() order by created_at for update skip locked limit 20)
  returning *;
$$;
revoke all on function claim_email_batch() from public,anon,authenticated;
grant execute on function claim_email_batch() to service_role;

-- Reporter can create a bounded report; only admin routes resolve it.
alter table quality_reports add column if not exists reported_by uuid references auth.users(id) on delete set null;
create policy quality_reports_submit on quality_reports for insert to authenticated with check(type='user_report' and status='pending' and reported_by=auth.uid() and resolved_at is null and resolved_by is null and is_active_user());

-- Account deletion must not be blocked by admin/source references.
alter table opportunities drop constraint if exists opportunities_created_by_fkey;
alter table opportunities add constraint opportunities_created_by_fkey foreign key(created_by) references auth.users(id) on delete set null;
-- This compatibility object is a view over opportunities, not a table.
alter view imported_opportunities set (security_invoker=true);
alter table system_settings drop constraint if exists system_settings_updated_by_fkey;
alter table system_settings add constraint system_settings_updated_by_fkey foreign key(updated_by) references auth.users(id) on delete set null;
alter table quality_reports drop constraint if exists quality_reports_resolved_by_fkey;
alter table quality_reports add constraint quality_reports_resolved_by_fkey foreign key(resolved_by) references auth.users(id) on delete set null;
create or replace function remove_private_imports() returns trigger language plpgsql security definer set search_path=public as $$
begin
  delete from applications where user_id=OLD.id;
  delete from opportunities where created_by=OLD.id and status<>'published' and not exists(select 1 from applications where opportunity_id=opportunities.id);
  update opportunities set created_by=null,source_content=null,source_evidence=null where created_by=OLD.id;
  return OLD;
end $$;
create trigger remove_private_imports_on_deletion before delete on auth.users for each row execute function remove_private_imports();
