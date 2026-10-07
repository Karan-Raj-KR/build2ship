-- Read-only checks after applying the Supabase migrations. No fixtures or account writes.
begin read only;
do $$
begin
  if has_table_privilege('authenticated', 'public.profiles', 'DELETE') then
    raise exception 'Client profile deletion enabled';
  end if;
  if has_table_privilege('authenticated', 'public.ai_usage', 'INSERT,UPDATE,DELETE') then
    raise exception 'Client AI usage mutation enabled';
  end if;
  if has_function_privilege('authenticated', 'public.reserve_ai_usage(uuid,text,integer,integer)', 'EXECUTE') then
    raise exception 'Client quota function exposed';
  end if;
  if exists(select 1 from pg_tables where schemaname = 'public' and not rowsecurity) then
    raise exception 'Public table without RLS';
  end if;
  if exists(select 1 from auth.users u left join public.profiles p on p.id=u.id where p.id is null) then
    raise exception 'Auth account missing profile';
  end if;
end $$;
rollback;
