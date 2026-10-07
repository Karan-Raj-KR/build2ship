-- Schema ported from the application's fully migrated Postgres schema. No seed data.
CREATE TABLE public.accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 neon_id text UNIQUE,
 email text NOT NULL,
 legacy_email_verified boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
-- Accounts are server-only. The definer function returns only the authenticated account ID.


REVOKE ALL ON public.accounts FROM PUBLIC;


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

COMMENT ON SCHEMA "public" IS 'standard public schema';



SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."email_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_key" "text" NOT NULL,
    "recipient" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "html" "text" NOT NULL,
    "body_text" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_error" "text",
    "provider_message_id" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_deliveries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sending'::"text", 'sent'::"text", 'failed'::"text", 'cancelled'::"text"])))
);













CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "admin_email" "text" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."admin_sources" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'official_feed'::"text" NOT NULL,
    "official_domain" "text" NOT NULL,
    "category" "text" NOT NULL,
    "country" "text" DEFAULT 'GLOBAL'::"text",
    "default_mode" "text" DEFAULT 'remote'::"text",
    "is_verified" boolean DEFAULT true,
    "is_enabled" boolean DEFAULT true,
    "refresh_interval_days" integer DEFAULT 7,
    "last_run_at" timestamp with time zone,
    "last_status" "text" DEFAULT 'healthy'::"text",
    "error_count" integer DEFAULT 0,
    "last_error" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."ai_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "usage_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_usage_usage_type_check" CHECK (("usage_type" = ANY (ARRAY['analysis'::"text", 'draft'::"text", 'extraction'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."analysis_records" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "opportunity_version_ts" timestamp with time zone,
    "profile_updated_at" timestamp with time zone,
    "result" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."application_answers" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "answer_draft" "text",
    "evidence_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "revised_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."application_evidence_links" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "evidence_id" "uuid" NOT NULL,
    "question_key" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."application_tasks" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "completed" boolean DEFAULT false,
    "due_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sort_order" bigint DEFAULT 0 NOT NULL,
    "pinned_to_today" boolean DEFAULT false NOT NULL,
    "source_required" boolean DEFAULT false NOT NULL,
    "task_key" "text",
    CONSTRAINT "application_tasks_task_key_check" CHECK (("task_key" = ANY (ARRAY['eligibility'::"text", 'materials'::"text", 'review'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "stage" "text" DEFAULT 'saved'::"text" NOT NULL,
    "next_action" "text",
    "target_date" "date",
    "notes" "text",
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sort_order" bigint DEFAULT 0 NOT NULL,
    CONSTRAINT "applications_stage_check" CHECK (("stage" = ANY (ARRAY['saved'::"text", 'preparing'::"text", 'submitted'::"text", 'selected'::"text", 'rejected'::"text", 'withdrawn'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."opportunities" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "created_by" "uuid",
    "title" "text" NOT NULL,
    "organizer" "text",
    "category" "text",
    "summary" "text",
    "source_url" "text",
    "location" "text",
    "participation_mode" "text",
    "funding_description" "text",
    "funding_kind" "text",
    "deadline" timestamp with time zone,
    "timezone_known" boolean DEFAULT false,
    "source_content" "text",
    "retrieved_at" timestamp with time zone,
    "source_status" "text" DEFAULT 'unknown'::"text",
    "requirements" "jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "is_demo" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "source_label" "text" DEFAULT 'curated'::"text",
    "deadline_timezone" "text",
    "deadline_timezone_known" boolean DEFAULT false,
    "deadline_raw_text" "text",
    "funding_amount_min" integer,
    "funding_amount_max" integer,
    "funding_currency" "text",
    "funding_conditional" boolean DEFAULT false,
    "application_questions" "text"[] DEFAULT '{}'::"text"[],
    "required_documents" "text"[] DEFAULT '{}'::"text"[],
    "application_steps" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "official_url" "text",
    "discovered_url" "text",
    "source_evidence" "text",
    "application_effort" "text",
    "topics" "text"[] DEFAULT '{}'::"text"[],
    "skills" "text"[] DEFAULT '{}'::"text"[],
    "education_stages" "text"[] DEFAULT '{}'::"text"[],
    "citizenship_constraints" "text"[] DEFAULT '{}'::"text"[],
    "residency_constraints" "text"[] DEFAULT '{}'::"text"[],
    "edition_year" integer,
    "last_verified_at" timestamp with time zone,
    "source_changed_at" timestamp with time zone,
    "benefits" "text"[] DEFAULT '{}'::"text"[],
    "eligible_countries" "text"[] DEFAULT '{}'::"text"[],
    "visa_requirements" "text",
    "is_recurring" boolean DEFAULT false,
    "recurring_cycle" "text",
    "publication_status" "text" DEFAULT 'published'::"text",
    "is_featured" boolean DEFAULT false,
    "quality_flags" "jsonb" DEFAULT '{}'::"jsonb",
    "source_type" "text",
    CONSTRAINT "opportunities_application_effort_check" CHECK (("application_effort" = ANY (ARRAY['quick'::"text", 'moderate'::"text", 'significant'::"text"]))),
    CONSTRAINT "opportunities_funding_kind_check" CHECK (("funding_kind" = ANY (ARRAY['prize'::"text", 'stipend'::"text", 'reimbursement'::"text", 'cost'::"text", 'none'::"text", 'unknown'::"text"]))),
    CONSTRAINT "opportunities_participation_mode_check" CHECK (("participation_mode" = ANY (ARRAY['remote'::"text", 'in-person'::"text", 'hybrid'::"text"]))),
    CONSTRAINT "opportunities_publication_status_check" CHECK (("publication_status" = ANY (ARRAY['published'::"text", 'draft'::"text", 'archived'::"text"]))),
    CONSTRAINT "opportunities_source_label_check" CHECK (("source_label" = ANY (ARRAY['curated'::"text", 'fetched'::"text", 'user_provided'::"text", 'seed'::"text"]))),
    CONSTRAINT "opportunities_source_status_check" CHECK (("source_status" = ANY (ARRAY['live'::"text", 'unknown'::"text", 'closed'::"text"]))),
    CONSTRAINT "opportunities_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);

CREATE OR REPLACE VIEW "public"."imported_opportunities" WITH ("security_invoker"='true') AS
 SELECT "id",
    "created_by",
    "title",
    "organizer",
    "category",
    "summary",
    "source_url",
    "location",
    "participation_mode",
    "funding_description",
    "funding_kind",
    "deadline",
    "timezone_known",
    "source_content",
    "retrieved_at",
    "source_status",
    "requirements",
    "status",
    "is_demo",
    "updated_at",
    "source_label",
    "deadline_timezone",
    "deadline_timezone_known",
    "deadline_raw_text",
    "funding_amount_min",
    "funding_amount_max",
    "funding_currency",
    "funding_conditional",
    "application_questions",
    "required_documents",
    "application_steps",
    "created_at"
   FROM "public"."opportunities"
  WHERE ("source_label" = ANY (ARRAY['fetched'::"text", 'user_provided'::"text"]));

CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "user_id" "uuid" NOT NULL,
    "in_app_enabled" boolean DEFAULT true NOT NULL,
    "email_enabled" boolean DEFAULT false NOT NULL,
    "push_enabled" boolean DEFAULT false NOT NULL,
    "frequency" "text" DEFAULT 'instant'::"text" NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "quiet_hours_start" "text",
    "quiet_hours_end" "text",
    "deadline_reminder_days" integer[] DEFAULT '{7,3,1}'::integer[],
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unsubscribe_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "notification_preferences_frequency_check" CHECK (("frequency" = ANY (ARRAY['instant'::"text", 'daily'::"text", 'weekly'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."opportunity_collection_items" (
    "collection_id" "uuid" NOT NULL,
    "application_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."opportunity_collections" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "opportunity_collections_name_check" CHECK ((("char_length"(TRIM(BOTH FROM "name")) >= 1) AND ("char_length"(TRIM(BOTH FROM "name")) <= 80)))
);

CREATE TABLE IF NOT EXISTS "public"."payment_orders" (
    "order_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "currency" "text" NOT NULL,
    "duration_days" integer NOT NULL,
    "status" "text" DEFAULT 'created'::"text" NOT NULL,
    "payment_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_orders_amount_check" CHECK (("amount" > 0)),
    CONSTRAINT "payment_orders_duration_days_check" CHECK (("duration_days" > 0))
);

CREATE TABLE IF NOT EXISTS "public"."payment_passes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "payment_id" "text" NOT NULL,
    "order_id" "text" NOT NULL,
    "amount" integer NOT NULL,
    "currency" "text" DEFAULT 'INR'::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_passes_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'revoked'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."profile_evidence" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "start_date" "date",
    "end_date" "date",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "evidence_url" "text",
    "confirmed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profile_evidence_kind_check" CHECK (("kind" = ANY (ARRAY['project'::"text", 'achievement'::"text", 'experience'::"text", 'fact'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."profile_insights" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "profile_version_ts" timestamp with time zone DEFAULT "now"() NOT NULL,
    "strongest_signals" "text"[] DEFAULT '{}'::"text"[],
    "differentiators" "text"[] DEFAULT '{}'::"text"[],
    "weak_signals" "text"[] DEFAULT '{}'::"text"[],
    "likely_unlocks" "text"[] DEFAULT '{}'::"text"[],
    "suggested_actions" "text"[] DEFAULT '{}'::"text"[],
    "actionable_gaps" "jsonb" DEFAULT '[]'::"jsonb",
    "summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "country_of_residence" "text",
    "nationalities" "text"[] DEFAULT '{}'::"text"[],
    "university" "text",
    "degree" "text",
    "field_of_study" "text",
    "education_stage" "text",
    "expected_graduation" "date",
    "skills" "text"[] DEFAULT '{}'::"text"[],
    "interests" "text"[] DEFAULT '{}'::"text"[],
    "opportunity_types" "text"[] DEFAULT '{}'::"text"[],
    "participation_preference" "text",
    "travel_constraints" "text",
    "max_budget_amount" numeric,
    "max_budget_currency" "text",
    "age_band" "text",
    "onboarding_completed" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_admin" boolean DEFAULT false,
    "github_url" "text",
    "linkedin_url" "text",
    "portfolio_url" "text",
    "other_links" "text"[] DEFAULT '{}'::"text"[],
    "target_roles" "text"[] DEFAULT '{}'::"text"[],
    "target_industries" "text"[] DEFAULT '{}'::"text"[],
    "preferred_countries" "text"[] DEFAULT '{}'::"text"[],
    "willing_to_relocate" boolean DEFAULT false,
    "willing_to_travel" boolean DEFAULT true,
    "paid_only_preference" boolean DEFAULT false,
    "time_availability" "text",
    "effort_tolerance" "text",
    "role" "text" DEFAULT 'user'::"text",
    "work_authorizations" "text"[] DEFAULT '{}'::"text"[],
    "is_suspended" boolean DEFAULT false,
    "onboarding_step" integer DEFAULT 0 NOT NULL,
    "discovery_goal" "text",
    "study_year" "text",
    "experience_summary" "text",
    CONSTRAINT "profiles_discovery_goal_check" CHECK (("discovery_goal" = ANY (ARRAY['Build my career'::"text", 'Fund my education'::"text", 'Launch something'::"text", 'Explore & grow'::"text"]))),
    CONSTRAINT "profiles_education_stage_check" CHECK (("education_stage" = ANY (ARRAY['undergraduate'::"text", 'masters'::"text", 'phd'::"text", 'other'::"text"]))),
    CONSTRAINT "profiles_effort_tolerance_check" CHECK (("effort_tolerance" = ANY (ARRAY['quick'::"text", 'moderate'::"text", 'significant'::"text"]))),
    CONSTRAINT "profiles_onboarding_step_check" CHECK ((("onboarding_step" >= 0) AND ("onboarding_step" <= 4))),
    CONSTRAINT "profiles_participation_preference_check" CHECK (("participation_preference" = ANY (ARRAY['remote'::"text", 'in-person'::"text", 'both'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'editor'::"text", 'user'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."progress_rewards" (
    "user_id" "uuid" NOT NULL,
    "event_key" "text" NOT NULL,
    "xp" integer NOT NULL,
    "awarded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "progress_rewards_xp_check" CHECK ((("xp" >= 1) AND ("xp" <= 100)))
);

CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "keys" "jsonb" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."quality_reports" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "reported_by" "uuid",
    CONSTRAINT "quality_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'resolved'::"text", 'ignored'::"text"]))),
    CONSTRAINT "quality_reports_type_check" CHECK (("type" = ANY (ARRAY['stale'::"text", 'broken_link'::"text", 'uncertain_extraction'::"text", 'conflicting_evidence'::"text", 'user_report'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."recommendation_feedback" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recommendation_feedback_action_check" CHECK (("action" = ANY (ARRAY['interested'::"text", 'not_interested'::"text", 'not_relevant'::"text", 'already_knew'::"text", 'not_eligible'::"text", 'applied'::"text", 'hide'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."saved_searches" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "query_text" "text" NOT NULL,
    "structured_query" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notify_new_matches" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."scout_runs" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "query_text" "text" NOT NULL,
    "structured_query" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result_count" integer DEFAULT 0,
    "status" "text" DEFAULT 'completed'::"text",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "scout_runs_status_check" CHECK (("status" = ANY (ARRAY['completed'::"text", 'failed'::"text", 'running'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);

CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" NOT NULL,
    "link_url" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_key" "text",
    CONSTRAINT "user_notifications_type_check" CHECK (("type" = ANY (ARRAY['new_match'::"text", 'deadline'::"text", 'change'::"text", 'scout'::"text", 'application'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."workspace_milestones" (
    "user_id" "uuid" NOT NULL,
    "milestone" "text" NOT NULL,
    "achieved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workspace_milestones_milestone_check" CHECK (("milestone" = ANY (ARRAY['first_saved'::"text", 'first_eligibility_review'::"text", 'first_prepared'::"text", 'first_submitted'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."workspace_preferences" (
    "user_id" "uuid" NOT NULL,
    "weekly_focus" "text",
    "celebrations_enabled" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE OR REPLACE FUNCTION public.current_account_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT id FROM public.accounts WHERE neon_id = auth.user_id() $$;
CREATE OR REPLACE FUNCTION public.request_role() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT CASE WHEN current_user = 'neondb_owner' THEN 'service_role' ELSE current_user::text END $$;
CREATE OR REPLACE FUNCTION "public"."award_adventure_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
CREATE OR REPLACE FUNCTION "public"."claim_email_batch"() RETURNS SETOF "public"."email_deliveries"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update email_deliveries set status='sending', attempts=attempts+1, next_attempt_at=now()+interval '10 minutes'
  where id in (select id from email_deliveries where status in ('pending','failed','sending') and attempts<5 and next_attempt_at<=now() order by created_at for update skip locked limit 20)
  returning *;
$$;
CREATE OR REPLACE FUNCTION "public"."grant_payment_access"("p_order_id" "text", "p_payment_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
CREATE OR REPLACE FUNCTION "public"."is_active_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(select 1 from profiles where id = public.current_account_id() and not coalesce(is_suspended,false));
$$;
CREATE OR REPLACE FUNCTION "public"."prevent_admin_self_promotion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if coalesce(public.request_role(), '') <> 'service_role' then
    if TG_OP = 'INSERT' then
      if NEW.is_admin or coalesce(NEW.role, 'user') <> 'user' or NEW.is_suspended then raise exception 'Privileged profile fields are server-managed'; end if;
    elsif NEW.is_admin is distinct from OLD.is_admin or NEW.role is distinct from OLD.role or NEW.is_suspended is distinct from OLD.is_suspended then
      raise exception 'Privileged profile fields are server-managed';
    end if;
  end if;
  return NEW;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."remove_private_imports"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  delete from applications where user_id=OLD.id;
  delete from opportunities where created_by=OLD.id and status<>'published' and not exists(select 1 from applications where opportunity_id=opportunities.id);
  update opportunities set created_by=null,source_content=null,source_evidence=null where created_by=OLD.id;
  return OLD;
end $$;
CREATE OR REPLACE FUNCTION "public"."start_preparation"("p_opportunity_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare application uuid; begin
  if public.current_account_id() is null then raise exception 'Sign in to prepare an application'; end if;
  if not exists(select 1 from opportunities where id=p_opportunity_id) then raise exception 'Opportunity not available'; end if;
  insert into applications(user_id,opportunity_id,stage) values(public.current_account_id(),p_opportunity_id,'preparing')
    on conflict(user_id,opportunity_id) do update set stage=case when applications.stage='saved' then 'preparing' else applications.stage end
    returning id into application;
  insert into application_tasks(application_id,user_id,title,task_key,sort_order,source_required)
    values(application,public.current_account_id(),'Read the official rules and check eligibility','eligibility',0,true),
          (application,public.current_account_id(),'Prepare the required documents or project materials','materials',1,true),
          (application,public.current_account_id(),'Review the submission requirements and deadline','review',2,true)
    on conflict(application_id,task_key) where task_key is not null do nothing;
  return application;
end $$;
GRANT EXECUTE ON FUNCTION public.current_account_id() TO authenticated;
ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."admin_sources"
    ADD CONSTRAINT "admin_sources_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."ai_usage"
    ADD CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."analysis_records"
    ADD CONSTRAINT "analysis_records_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."application_answers"
    ADD CONSTRAINT "application_answers_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."application_evidence_links"
    ADD CONSTRAINT "application_evidence_links_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."application_tasks"
    ADD CONSTRAINT "application_tasks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_user_id_opportunity_id_key" UNIQUE ("user_id", "opportunity_id");

ALTER TABLE ONLY "public"."email_deliveries"
    ADD CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."email_deliveries"
    ADD CONSTRAINT "email_deliveries_user_id_event_key_key" UNIQUE ("user_id", "event_key");

ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id");

ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."opportunity_collection_items"
    ADD CONSTRAINT "opportunity_collection_items_pkey" PRIMARY KEY ("collection_id", "application_id");

ALTER TABLE ONLY "public"."opportunity_collections"
    ADD CONSTRAINT "opportunity_collections_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."opportunity_collections"
    ADD CONSTRAINT "opportunity_collections_user_id_name_key" UNIQUE ("user_id", "name");

ALTER TABLE ONLY "public"."payment_orders"
    ADD CONSTRAINT "payment_orders_payment_id_key" UNIQUE ("payment_id");

ALTER TABLE ONLY "public"."payment_orders"
    ADD CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("order_id");

ALTER TABLE ONLY "public"."payment_passes"
    ADD CONSTRAINT "payment_passes_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profile_evidence"
    ADD CONSTRAINT "profile_evidence_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profile_insights"
    ADD CONSTRAINT "profile_insights_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."progress_rewards"
    ADD CONSTRAINT "progress_rewards_pkey" PRIMARY KEY ("user_id", "event_key");

ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");

ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."quality_reports"
    ADD CONSTRAINT "quality_reports_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."recommendation_feedback"
    ADD CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."saved_searches"
    ADD CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."scout_runs"
    ADD CONSTRAINT "scout_runs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key");

ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."workspace_milestones"
    ADD CONSTRAINT "workspace_milestones_pkey" PRIMARY KEY ("user_id", "milestone");

ALTER TABLE ONLY "public"."workspace_preferences"
    ADD CONSTRAINT "workspace_preferences_pkey" PRIMARY KEY ("user_id");

CREATE UNIQUE INDEX "application_preparation_step_unique" ON "public"."application_tasks" USING "btree" ("application_id", "task_key") WHERE ("task_key" IS NOT NULL);

CREATE INDEX "application_tasks_user_pinned_order" ON "public"."application_tasks" USING "btree" ("user_id", "pinned_to_today", "sort_order");

CREATE INDEX "applications_user_stage_order" ON "public"."applications" USING "btree" ("user_id", "stage", "sort_order");

CREATE INDEX "idx_ai_usage_created_at" ON "public"."ai_usage" USING "btree" ("created_at");

CREATE INDEX "idx_ai_usage_user_id" ON "public"."ai_usage" USING "btree" ("user_id");

CREATE INDEX "idx_analytics_events_event" ON "public"."analytics_events" USING "btree" ("event");

CREATE UNIQUE INDEX "idx_analytics_events_user_event" ON "public"."analytics_events" USING "btree" ("user_id", "event");

CREATE INDEX "idx_analytics_events_user_id" ON "public"."analytics_events" USING "btree" ("user_id");

CREATE INDEX "idx_opportunities_category" ON "public"."opportunities" USING "btree" ("category");

CREATE INDEX "idx_opportunities_deadline" ON "public"."opportunities" USING "btree" ("deadline");

CREATE INDEX "idx_opportunities_eligible_countries" ON "public"."opportunities" USING "gin" ("eligible_countries");

CREATE INDEX "idx_opportunities_publication_status" ON "public"."opportunities" USING "btree" ("publication_status");

CREATE INDEX "idx_opportunities_skills" ON "public"."opportunities" USING "gin" ("skills");

CREATE INDEX "idx_opportunities_status" ON "public"."opportunities" USING "btree" ("status");

CREATE INDEX "idx_opportunities_topics" ON "public"."opportunities" USING "gin" ("topics");

CREATE INDEX "idx_payment_passes_status" ON "public"."payment_passes" USING "btree" ("status");

CREATE INDEX "idx_payment_passes_user_id" ON "public"."payment_passes" USING "btree" ("user_id");

CREATE INDEX "idx_push_subscriptions_user" ON "public"."push_subscriptions" USING "btree" ("user_id");

CREATE INDEX "idx_user_notifications_user_created" ON "public"."user_notifications" USING "btree" ("user_id", "created_at" DESC);

CREATE INDEX "idx_user_notifications_user_unread" ON "public"."user_notifications" USING "btree" ("user_id") WHERE ("is_read" = false);

CREATE UNIQUE INDEX "notifications_event_unique" ON "public"."user_notifications" USING "btree" ("user_id", "event_key");

CREATE UNIQUE INDEX "payment_passes_order_unique" ON "public"."payment_passes" USING "btree" ("order_id");

CREATE UNIQUE INDEX "payment_passes_payment_unique" ON "public"."payment_passes" USING "btree" ("payment_id");

CREATE UNIQUE INDEX "preferences_unsubscribe_unique" ON "public"."notification_preferences" USING "btree" ("unsubscribe_token");

CREATE OR REPLACE TRIGGER "preparation_adventure_rewards" AFTER INSERT OR UPDATE ON "public"."application_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."award_adventure_progress"();

CREATE OR REPLACE TRIGGER "prevent_admin_promotion" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_admin_self_promotion"();

CREATE OR REPLACE TRIGGER "profile_adventure_rewards" AFTER INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."award_adventure_progress"();

CREATE OR REPLACE TRIGGER "save_adventure_rewards" AFTER INSERT ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."award_adventure_progress"();

ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."ai_usage"
    ADD CONSTRAINT "ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."analysis_records"
    ADD CONSTRAINT "analysis_records_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."analysis_records"
    ADD CONSTRAINT "analysis_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."application_answers"
    ADD CONSTRAINT "application_answers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."application_answers"
    ADD CONSTRAINT "application_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."application_evidence_links"
    ADD CONSTRAINT "application_evidence_links_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."application_evidence_links"
    ADD CONSTRAINT "application_evidence_links_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "public"."profile_evidence"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."application_tasks"
    ADD CONSTRAINT "application_tasks_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."application_tasks"
    ADD CONSTRAINT "application_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."email_deliveries"
    ADD CONSTRAINT "email_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."opportunity_collection_items"
    ADD CONSTRAINT "opportunity_collection_items_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."opportunity_collection_items"
    ADD CONSTRAINT "opportunity_collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."opportunity_collections"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."opportunity_collection_items"
    ADD CONSTRAINT "opportunity_collection_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."opportunity_collections"
    ADD CONSTRAINT "opportunity_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."payment_orders"
    ADD CONSTRAINT "payment_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."payment_passes"
    ADD CONSTRAINT "payment_passes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profile_evidence"
    ADD CONSTRAINT "profile_evidence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profile_insights"
    ADD CONSTRAINT "profile_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."progress_rewards"
    ADD CONSTRAINT "progress_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."quality_reports"
    ADD CONSTRAINT "quality_reports_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."quality_reports"
    ADD CONSTRAINT "quality_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."quality_reports"
    ADD CONSTRAINT "quality_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."recommendation_feedback"
    ADD CONSTRAINT "recommendation_feedback_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."recommendation_feedback"
    ADD CONSTRAINT "recommendation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."saved_searches"
    ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."scout_runs"
    ADD CONSTRAINT "scout_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workspace_milestones"
    ADD CONSTRAINT "workspace_milestones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workspace_preferences"
    ADD CONSTRAINT "workspace_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

CREATE POLICY "Users can insert own AI usage" ON "public"."ai_usage" FOR INSERT WITH CHECK (("public"."current_account_id"() = "user_id"));

CREATE POLICY "Users can insert own analytics events" ON "public"."analytics_events" FOR INSERT WITH CHECK (("public"."current_account_id"() = "user_id"));

CREATE POLICY "Users can read own AI usage" ON "public"."ai_usage" FOR SELECT USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "Users can read own analytics events" ON "public"."analytics_events" FOR SELECT USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "Users can read own payment passes" ON "public"."payment_passes" FOR SELECT USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "active_account" ON "public"."analysis_records" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."application_answers" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."application_tasks" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."applications" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."notification_preferences" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."opportunity_collection_items" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."opportunity_collections" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."profile_evidence" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."profile_insights" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."push_subscriptions" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."recommendation_feedback" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."saved_searches" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."scout_runs" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."user_notifications" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

CREATE POLICY "active_account" ON "public"."workspace_preferences" AS RESTRICTIVE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());

ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_logs_insert" ON "public"."admin_audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_account_id"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE (("profiles"."is_admin" = true) OR ("profiles"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'editor'::"text"]))))));

CREATE POLICY "admin_audit_logs_select" ON "public"."admin_audit_logs" FOR SELECT TO "authenticated" USING (("public"."current_account_id"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE (("profiles"."is_admin" = true) OR ("profiles"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));

ALTER TABLE "public"."admin_sources" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_sources_mutate" ON "public"."admin_sources" TO "authenticated" USING (("public"."current_account_id"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE (("profiles"."is_admin" = true) OR ("profiles"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));

CREATE POLICY "admin_sources_select" ON "public"."admin_sources" FOR SELECT TO "authenticated" USING (true);

ALTER TABLE "public"."ai_usage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analysis_delete_own" ON "public"."analysis_records" FOR DELETE USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "analysis_insert_own" ON "public"."analysis_records" FOR INSERT WITH CHECK (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."analysis_records" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analysis_select_own" ON "public"."analysis_records" FOR SELECT USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "analysis_update_own" ON "public"."analysis_records" FOR UPDATE USING (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "answers_delete_own" ON "public"."application_answers" FOR DELETE USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "answers_insert_own" ON "public"."application_answers" FOR INSERT WITH CHECK (("public"."current_account_id"() = "user_id"));

CREATE POLICY "answers_select_own" ON "public"."application_answers" FOR SELECT USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "answers_update_own" ON "public"."application_answers" FOR UPDATE USING (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."application_answers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."application_evidence_links" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."application_tasks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications_delete_own" ON "public"."applications" FOR DELETE USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "applications_insert_own" ON "public"."applications" FOR INSERT WITH CHECK (("public"."current_account_id"() = "user_id"));

CREATE POLICY "applications_select_own" ON "public"."applications" FOR SELECT USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "applications_update_own" ON "public"."applications" FOR UPDATE USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "collection_items_own" ON "public"."opportunity_collection_items" USING (("public"."current_account_id"() = "user_id")) WITH CHECK ((("public"."current_account_id"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."opportunity_collections" "c"
  WHERE (("c"."id" = "opportunity_collection_items"."collection_id") AND ("c"."user_id" = "public"."current_account_id"())))) AND (EXISTS ( SELECT 1
   FROM "public"."applications" "a"
  WHERE (("a"."id" = "opportunity_collection_items"."application_id") AND ("a"."user_id" = "public"."current_account_id"()))))));

CREATE POLICY "collections_own" ON "public"."opportunity_collections" USING (("public"."current_account_id"() = "user_id")) WITH CHECK (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."email_deliveries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidence_delete_own" ON "public"."profile_evidence" FOR DELETE USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "evidence_insert_own" ON "public"."profile_evidence" FOR INSERT WITH CHECK (("public"."current_account_id"() = "user_id"));

CREATE POLICY "evidence_links_own" ON "public"."application_evidence_links" USING (("application_id" IN ( SELECT "applications"."id"
   FROM "public"."applications"
  WHERE ("applications"."user_id" = "public"."current_account_id"())))) WITH CHECK (("application_id" IN ( SELECT "applications"."id"
   FROM "public"."applications"
  WHERE ("applications"."user_id" = "public"."current_account_id"()))));

CREATE POLICY "evidence_select_own" ON "public"."profile_evidence" FOR SELECT USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "evidence_update_own" ON "public"."profile_evidence" FOR UPDATE USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "feedback_own" ON "public"."recommendation_feedback" USING (("public"."current_account_id"() = "user_id")) WITH CHECK (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_own" ON "public"."notification_preferences" USING (("public"."current_account_id"() = "user_id")) WITH CHECK (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."opportunities" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opportunities_insert_own" ON "public"."opportunities" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "public"."current_account_id"()) AND ("status" = 'draft'::"text") AND ("publication_status" = 'draft'::"text") AND ("last_verified_at" IS NULL) AND "public"."is_active_user"()));

CREATE POLICY "opportunities_select_own" ON "public"."opportunities" FOR SELECT USING (("public"."current_account_id"() = "created_by"));

CREATE POLICY "opportunities_select_published" ON "public"."opportunities" FOR SELECT USING (("status" = 'published'::"text"));

CREATE POLICY "opportunities_update_own" ON "public"."opportunities" FOR UPDATE TO "authenticated" USING ((("created_by" = "public"."current_account_id"()) AND ("status" = 'draft'::"text") AND "public"."is_active_user"())) WITH CHECK ((("created_by" = "public"."current_account_id"()) AND ("status" = 'draft'::"text") AND ("publication_status" = 'draft'::"text") AND ("last_verified_at" IS NULL) AND "public"."is_active_user"()));

ALTER TABLE "public"."opportunity_collection_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."opportunity_collections" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."payment_orders" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_orders_read_own" ON "public"."payment_orders" FOR SELECT TO "authenticated" USING (("user_id" = "public"."current_account_id"()));

ALTER TABLE "public"."payment_passes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profile_evidence" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profile_insights" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_insights_own" ON "public"."profile_insights" USING (("public"."current_account_id"() = "user_id")) WITH CHECK (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_delete_own" ON "public"."profiles" FOR DELETE USING (("public"."current_account_id"() = "id"));

CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("public"."current_account_id"() = "id"));

CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("public"."current_account_id"() = "id"));

CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING ((("public"."current_account_id"() = "id") AND (((("current_setting"('request.jwt.claims'::"text", true))::json ->> 'role'::"text") IS NOT NULL) OR ("is_admin" IS NOT TRUE))));

ALTER TABLE "public"."progress_rewards" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_rewards_read_own" ON "public"."progress_rewards" FOR SELECT TO "authenticated" USING ((("user_id" = "public"."current_account_id"()) AND "public"."is_active_user"()));

ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_own" ON "public"."push_subscriptions" USING (("public"."current_account_id"() = "user_id")) WITH CHECK (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."quality_reports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quality_reports_mutate" ON "public"."quality_reports" TO "authenticated" USING (("public"."current_account_id"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE (("profiles"."is_admin" = true) OR ("profiles"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'editor'::"text"]))))));

CREATE POLICY "quality_reports_select" ON "public"."quality_reports" FOR SELECT TO "authenticated" USING (("public"."current_account_id"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE (("profiles"."is_admin" = true) OR ("profiles"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'editor'::"text"]))))));

CREATE POLICY "quality_reports_submit" ON "public"."quality_reports" FOR INSERT TO "authenticated" WITH CHECK ((("type" = 'user_report'::"text") AND ("status" = 'pending'::"text") AND ("reported_by" = "public"."current_account_id"()) AND ("resolved_at" IS NULL) AND ("resolved_by" IS NULL) AND "public"."is_active_user"()));

ALTER TABLE "public"."recommendation_feedback" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."saved_searches" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_searches_own" ON "public"."saved_searches" USING (("public"."current_account_id"() = "user_id")) WITH CHECK (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."scout_runs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scout_runs_own" ON "public"."scout_runs" USING (("public"."current_account_id"() = "user_id")) WITH CHECK (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_settings_mutate" ON "public"."system_settings" TO "authenticated" USING (("public"."current_account_id"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE (("profiles"."is_admin" = true) OR ("profiles"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));

CREATE POLICY "system_settings_select" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "tasks_delete_own" ON "public"."application_tasks" FOR DELETE USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "tasks_insert_own" ON "public"."application_tasks" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "public"."current_account_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."applications"
  WHERE (("applications"."id" = "application_tasks"."application_id") AND ("applications"."user_id" = "public"."current_account_id"()))))));

CREATE POLICY "tasks_select_own" ON "public"."application_tasks" FOR SELECT USING (("public"."current_account_id"() = "user_id"));

CREATE POLICY "tasks_update_own" ON "public"."application_tasks" FOR UPDATE TO "authenticated" USING (("user_id" = "public"."current_account_id"())) WITH CHECK ((("user_id" = "public"."current_account_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."applications"
  WHERE (("applications"."id" = "application_tasks"."application_id") AND ("applications"."user_id" = "public"."current_account_id"()))))));

ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notifications_own" ON "public"."user_notifications" USING (("public"."current_account_id"() = "user_id")) WITH CHECK (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."workspace_milestones" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_milestones_own" ON "public"."workspace_milestones" USING (("public"."current_account_id"() = "user_id")) WITH CHECK (("public"."current_account_id"() = "user_id"));

ALTER TABLE "public"."workspace_preferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_preferences_own" ON "public"."workspace_preferences" USING (("public"."current_account_id"() = "user_id")) WITH CHECK (("public"."current_account_id"() = "user_id"));

GRANT USAGE ON SCHEMA "public" TO "authenticated";

REVOKE ALL ON FUNCTION "public"."award_adventure_progress"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."claim_email_batch"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."grant_payment_access"("p_order_id" "text", "p_payment_id" "text") FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."is_active_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_user"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."start_preparation"("p_opportunity_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_preparation"("p_opportunity_id" "uuid") TO "authenticated";



























































REVOKE ALL ON FUNCTION public.request_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_role() TO authenticated;
REVOKE ALL ON FUNCTION public.remove_private_imports() FROM PUBLIC;
-- Preserve explicit column permissions from the source schema. Never grant all public tables.

SET search_path = public;
GRANT SELECT, INSERT, UPDATE, DELETE ON
 profiles, profile_evidence, applications, application_tasks, application_answers,
 analysis_records, opportunities, opportunity_collections, opportunity_collection_items,
 workspace_preferences, workspace_milestones, profile_insights, scout_runs,
 saved_searches, recommendation_feedback, user_notifications, notification_preferences,
 push_subscriptions, ai_usage, analytics_events, quality_reports TO authenticated;
GRANT SELECT ON imported_opportunities, payment_passes, payment_orders, progress_rewards TO authenticated;

-- Apply before deploying the AI quota and account fixes. Safe to re-run.
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
REVOKE DELETE ON public.profiles FROM authenticated;
-- Usage is reserved only by authorized server calls, never by browser writes.
REVOKE INSERT, UPDATE, DELETE ON public.ai_usage FROM authenticated;
DROP POLICY IF EXISTS "Users can insert own AI usage" ON public.ai_usage;

DROP TRIGGER IF EXISTS cleanup_account_imports ON public.accounts;
CREATE TRIGGER cleanup_account_imports BEFORE DELETE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.remove_private_imports();

CREATE OR REPLACE FUNCTION public.reserve_ai_usage(
  p_user_id uuid, p_usage_type text, p_free_limit integer, p_paid_limit integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE usage_id uuid; allowance integer;
BEGIN
  IF p_usage_type NOT IN ('analysis','draft') OR p_free_limit < 0 OR p_paid_limit < 0
    OR p_free_limit IS NULL OR p_paid_limit IS NULL THEN
    RAISE EXCEPTION 'Invalid AI allowance configuration';
  END IF;
  -- Serialize reservations per account across all app instances. Each following
  -- statement gets a fresh snapshot after the previous reservation commits.
  PERFORM id FROM profiles WHERE id = p_user_id AND NOT is_suspended FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active account required'; END IF;
  allowance := CASE WHEN EXISTS(SELECT 1 FROM payment_passes WHERE user_id = p_user_id
    AND status = 'active' AND expires_at > now()) THEN p_paid_limit ELSE p_free_limit END;
  IF (SELECT count(*) FROM ai_usage WHERE user_id = p_user_id AND created_at > now() - interval '1 minute') >= 20
    OR (SELECT count(*) FROM ai_usage WHERE user_id = p_user_id
      AND (usage_type = p_usage_type OR (p_usage_type = 'analysis' AND usage_type = 'extraction'))
      AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') >= allowance THEN
    RETURN NULL;
  END IF;
  INSERT INTO ai_usage(user_id,usage_type) VALUES(p_user_id,p_usage_type) RETURNING id INTO usage_id;
  RETURN usage_id;
END $$;
REVOKE ALL ON FUNCTION public.reserve_ai_usage(uuid,text,integer,integer) FROM PUBLIC, authenticated;
