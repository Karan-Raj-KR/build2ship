-- Port of the latest PostgreSQL digest/retry migration for Supabase.
BEGIN;
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS digest_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digest_time time without time zone NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS schedule_changed_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.notification_preferences DROP CONSTRAINT IF EXISTS digest_day_valid;
ALTER TABLE public.notification_preferences ADD CONSTRAINT digest_day_valid CHECK (digest_day BETWEEN 0 AND 6);
ALTER TABLE public.email_deliveries
  ADD COLUMN IF NOT EXISTS preference_version timestamptz,
  ADD COLUMN IF NOT EXISTS opportunity_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.email_deliveries DROP CONSTRAINT IF EXISTS email_deliveries_status_check;
ALTER TABLE public.email_deliveries ADD CONSTRAINT email_deliveries_status_check
  CHECK (status IN ('pending','sending','sent','failed','cancelled','uncertain'));

CREATE OR REPLACE FUNCTION public.validate_notification_schedule() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone) THEN
    RAISE EXCEPTION 'Choose a valid IANA timezone';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.schedule_changed_at := now();
  ELSIF ROW(NEW.frequency,NEW.timezone,NEW.digest_day,NEW.digest_time,NEW.email_enabled,NEW.in_app_enabled)
    IS DISTINCT FROM ROW(OLD.frequency,OLD.timezone,OLD.digest_day,OLD.digest_time,OLD.email_enabled,OLD.in_app_enabled) THEN
    NEW.schedule_changed_at := now();
    UPDATE email_deliveries SET status = 'cancelled'
      WHERE user_id = NEW.user_id AND event_key LIKE 'digest:%' AND status IN ('pending','failed');
  ELSE
    NEW.schedule_changed_at := OLD.schedule_changed_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notification_schedule_changed ON public.notification_preferences;
CREATE TRIGGER notification_schedule_changed BEFORE INSERT OR UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.validate_notification_schedule();
REVOKE ALL ON FUNCTION public.validate_notification_schedule() FROM PUBLIC, authenticated;

CREATE OR REPLACE FUNCTION public.due_digest_slots(p_now timestamptz DEFAULT now())
RETURNS TABLE(user_id uuid, event_key text, preference_version timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH local_dates AS (
    SELECT n.*, (p_now AT TIME ZONE n.timezone)::date AS local_date
    FROM notification_preferences n JOIN pg_timezone_names z ON z.name = n.timezone
    WHERE n.email_enabled OR n.in_app_enabled
  ), candidates AS (
    SELECT n.*, (n.local_date - age) AS slot_date, (n.local_date - age + n.digest_time) AT TIME ZONE n.timezone AS due_at
    FROM local_dates n CROSS JOIN generate_series(0,7) age
    WHERE n.frequency = 'daily' OR extract(dow FROM n.local_date - age)::integer = n.digest_day
  ), latest AS (
    SELECT DISTINCT ON (user_id) * FROM candidates WHERE due_at <= p_now ORDER BY user_id, due_at DESC
  )
  SELECT user_id, 'digest:' || CASE WHEN frequency = 'daily' THEN 'daily:' || slot_date::text
    ELSE 'weekly:' || date_trunc('week',slot_date)::date::text END, schedule_changed_at
  FROM latest WHERE due_at > schedule_changed_at AND due_at >= p_now - interval '26 hours';
$$;
REVOKE ALL ON FUNCTION public.due_digest_slots(timestamptz) FROM PUBLIC, authenticated;

CREATE OR REPLACE FUNCTION public.claim_email_batch() RETURNS SETOF public.email_deliveries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE email_deliveries SET status = 'uncertain', last_error = 'Worker lease expired; reconcile provider logs before retry'
    WHERE status = 'sending' AND next_attempt_at <= now();
  RETURN QUERY UPDATE email_deliveries SET status='sending', attempts=attempts+1, next_attempt_at=now()+interval '10 minutes'
    WHERE id IN (SELECT id FROM email_deliveries WHERE status IN ('pending','failed') AND attempts<5 AND next_attempt_at<=now()
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 20) RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.claim_email_batch() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_batch() TO service_role;
COMMIT;
