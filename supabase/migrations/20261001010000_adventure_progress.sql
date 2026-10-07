-- Durable progressive onboarding and server-awarded, immutable XP.
alter table profiles add column if not exists onboarding_step integer not null default 0 check (onboarding_step between 0 and 4);
alter table profiles add column if not exists discovery_goal text check (discovery_goal in ('Build my career','Fund my education','Launch something','Explore & grow'));
alter table profiles add column if not exists study_year text;
alter table profiles add column if not exists experience_summary text;
alter table application_tasks add column if not exists task_key text check(task_key in ('eligibility','materials','review'));
create unique index if not exists application_preparation_step_unique on application_tasks(application_id,task_key) where task_key is not null;

create table if not exists progress_rewards (
  user_id uuid not null references profiles(id) on delete cascade,
  event_key text not null,
  xp integer not null check(xp between 1 and 100),
  awarded_at timestamptz not null default now(),
  primary key(user_id,event_key)
);
alter table progress_rewards enable row level security;
grant select on progress_rewards to authenticated;
create policy progress_rewards_read_own on progress_rewards for select to authenticated using(user_id=auth.uid() and public.is_active_user());
-- No client INSERT/UPDATE/DELETE policy: rewards are created by triggers only.
create or replace function award_adventure_progress() returns trigger language plpgsql security definer set search_path=public as $$
declare opportunity uuid; begin
  if TG_TABLE_NAME='profiles' then
    if new.discovery_goal is not null and cardinality(new.interests)>0 and new.country_of_residence is not null and new.education_stage is not null then
      insert into progress_rewards(user_id,event_key,xp) values(new.id,'profile:basics',25) on conflict do nothing;
    end if;
    if cardinality(new.skills)>0 then insert into progress_rewards(user_id,event_key,xp) values(new.id,'profile:skills',5) on conflict do nothing; end if;
    if length(trim(coalesce(new.experience_summary,'')))>=20 then insert into progress_rewards(user_id,event_key,xp) values(new.id,'profile:experience',5) on conflict do nothing; end if;
    if coalesce(nullif(trim(new.portfolio_url),''),nullif(trim(new.github_url),'')) is not null then insert into progress_rewards(user_id,event_key,xp) values(new.id,'profile:portfolio',5) on conflict do nothing; end if;
  elsif TG_TABLE_NAME='applications' then
    insert into progress_rewards(user_id,event_key,xp) values(new.user_id,'first_saved',20) on conflict do nothing;
  elsif TG_TABLE_NAME='application_tasks' and new.completed and new.task_key is not null then
    select opportunity_id into opportunity from applications where id=new.application_id and user_id=new.user_id for update;
    if opportunity is null then raise exception 'Preparation must belong to your application'; end if;
    insert into progress_rewards(user_id,event_key,xp) values(new.user_id,'step:'||opportunity||':'||new.task_key,10) on conflict do nothing;
    if (select count(distinct task_key) from application_tasks where application_id=new.application_id and completed and task_key in ('eligibility','materials','review'))=3 then
      insert into progress_rewards(user_id,event_key,xp) values(new.user_id,'prepared:'||opportunity,20) on conflict do nothing;
      insert into progress_rewards(user_id,event_key,xp) values(new.user_id,'first_prepared',25) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
revoke all on function award_adventure_progress() from public;
create trigger profile_adventure_rewards after insert or update on profiles for each row execute function award_adventure_progress();
create trigger save_adventure_rewards after insert on applications for each row execute function award_adventure_progress();
create trigger preparation_adventure_rewards after insert or update on application_tasks for each row execute function award_adventure_progress();

-- One transaction creates/reuses a workspace and its three canonical steps.
create or replace function start_preparation(p_opportunity_id uuid) returns uuid language plpgsql security invoker set search_path=public as $$
declare application uuid; begin
  if auth.uid() is null then raise exception 'Sign in to prepare an application'; end if;
  if not exists(select 1 from opportunities where id=p_opportunity_id) then raise exception 'Opportunity not available'; end if;
  insert into applications(user_id,opportunity_id,stage) values(auth.uid(),p_opportunity_id,'preparing')
    on conflict(user_id,opportunity_id) do update set stage=case when applications.stage='saved' then 'preparing' else applications.stage end
    returning id into application;
  insert into application_tasks(application_id,user_id,title,task_key,sort_order,source_required)
    values(application,auth.uid(),'Read the official rules and check eligibility','eligibility',0,true),
          (application,auth.uid(),'Prepare the required documents or project materials','materials',1,true),
          (application,auth.uid(),'Review the submission requirements and deadline','review',2,true)
    on conflict(application_id,task_key) where task_key is not null do nothing;
  return application;
end $$;
revoke all on function start_preparation(uuid) from public,anon;
grant execute on function start_preparation(uuid) to authenticated;

-- Enforce the relationship as well as ownership on direct REST task writes.
drop policy if exists tasks_insert_own on application_tasks;
drop policy if exists tasks_update_own on application_tasks;
create policy tasks_insert_own on application_tasks for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from applications where id=application_id and user_id=auth.uid()));
create policy tasks_update_own on application_tasks for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from applications where id=application_id and user_id=auth.uid()));
