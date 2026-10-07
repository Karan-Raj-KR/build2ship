-- Profiles are deleted only through the verified server-side Auth deletion flow.
revoke delete on public.profiles from anon, authenticated;
drop policy if exists profiles_delete_own on public.profiles;

-- Direct server SQL uses the database owner; Data API clients use authenticated.
-- Permit trusted administration without permitting client role/suspension changes.
create or replace function public.prevent_admin_self_promotion()
returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    if TG_OP = 'INSERT' then
      if NEW.is_admin or coalesce(NEW.role, 'user') <> 'user' or NEW.is_suspended then
        raise exception 'Privileged profile fields are server-managed';
      end if;
    elsif NEW.is_admin is distinct from OLD.is_admin or NEW.role is distinct from OLD.role
      or NEW.is_suspended is distinct from OLD.is_suspended then
      raise exception 'Privileged profile fields are server-managed';
    end if;
  end if;
  return NEW;
end;
$$;

-- Include accounts created before the profile trigger was installed.
insert into public.profiles(id, display_name)
select id, coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
from auth.users on conflict(id) do nothing;

-- Historical schema seeds are examples, not verified live opportunities.
update public.opportunities set is_demo = true, source_status = 'unknown', last_verified_at = null
where id in ('c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002',
  'c1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000004',
  'c1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000006');
