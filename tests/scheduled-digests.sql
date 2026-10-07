-- Isolated QA only, with migration 003. Fixtures and claims roll back.
BEGIN;
DO $$
DECLARE a uuid := gen_random_uuid(); k text; delivery uuid; n integer;
BEGIN
  INSERT INTO accounts(id,email) VALUES(a,'digest-qa@example.invalid');
  INSERT INTO profiles(id) VALUES(a);
  INSERT INTO notification_preferences(user_id,email_enabled,frequency,timezone,digest_day,digest_time)
    VALUES(a,true,'weekly','Asia/Kolkata',0,'09:00');
  IF EXISTS(SELECT 1 FROM due_digest_slots('2027-02-07 03:29:59Z') s WHERE s.user_id=a) THEN RAISE EXCEPTION 'Early India digest'; END IF;
  SELECT event_key INTO k FROM due_digest_slots('2027-02-07 03:30Z') s WHERE s.user_id=a;
  IF k IS DISTINCT FROM 'digest:weekly:2027-02-01' THEN RAISE EXCEPTION 'Sunday 9 AM offset failed'; END IF;
  IF EXISTS(SELECT 1 FROM due_digest_slots('2027-02-08 05:31Z') s WHERE s.user_id=a) THEN RAISE EXCEPTION 'Old missed digest replayed'; END IF;
  UPDATE notification_preferences SET timezone='America/New_York',digest_time='02:30' WHERE user_id=a;
  IF EXISTS(SELECT 1 FROM due_digest_slots('2027-03-14 07:29Z') s WHERE s.user_id=a) THEN RAISE EXCEPTION 'Spring DST early send'; END IF;
  IF NOT EXISTS(SELECT 1 FROM due_digest_slots('2027-03-14 07:30Z') s WHERE s.user_id=a) THEN RAISE EXCEPTION 'Spring DST missing-time shift failed'; END IF;
  UPDATE notification_preferences SET digest_time='01:30' WHERE user_id=a;
  IF EXISTS(SELECT 1 FROM due_digest_slots('2027-11-07 05:30Z') s WHERE s.user_id=a) THEN RAISE EXCEPTION 'Fall DST first occurrence sent'; END IF;
  IF NOT EXISTS(SELECT 1 FROM due_digest_slots('2027-11-07 06:30Z') s WHERE s.user_id=a) THEN RAISE EXCEPTION 'Fall DST standard occurrence failed'; END IF;
  INSERT INTO email_deliveries(user_id,event_key,recipient,subject,html,body_text)
    VALUES(a,'digest:weekly:test','digest-qa@example.invalid','QA','QA','QA') RETURNING id INTO delivery;
  INSERT INTO email_deliveries(user_id,event_key,recipient,subject,html,body_text)
    VALUES(a,'digest:weekly:test','digest-qa@example.invalid','QA','QA','QA') ON CONFLICT(user_id,event_key) DO NOTHING;
  SELECT count(*) INTO n FROM email_deliveries WHERE id=delivery;
  IF n<>1 THEN RAISE EXCEPTION 'Delivery identity not durable'; END IF;
  PERFORM * FROM claim_email_batch();
  IF NOT EXISTS(SELECT 1 FROM email_deliveries WHERE id=delivery AND status='sending' AND attempts=1) THEN RAISE EXCEPTION 'Delivery not claimed'; END IF;
  IF EXISTS(SELECT 1 FROM claim_email_batch() WHERE id=delivery) THEN RAISE EXCEPTION 'In-flight delivery claimed twice'; END IF;
  UPDATE email_deliveries SET next_attempt_at=now()-interval '1 minute' WHERE id=delivery;
  PERFORM * FROM claim_email_batch();
  IF NOT EXISTS(SELECT 1 FROM email_deliveries WHERE id=delivery AND status='uncertain') THEN RAISE EXCEPTION 'Ambiguous send was retried'; END IF;
  UPDATE email_deliveries SET status='pending' WHERE id=delivery;
  UPDATE notification_preferences SET email_enabled=false WHERE user_id=a;
  IF NOT EXISTS(SELECT 1 FROM email_deliveries WHERE id=delivery AND status='cancelled') THEN RAISE EXCEPTION 'Unsubscribe failed to cancel queue'; END IF;
  UPDATE notification_preferences SET in_app_enabled=false WHERE user_id=a;
  IF EXISTS(SELECT 1 FROM due_digest_slots('2027-11-07 06:30Z') s WHERE s.user_id=a) THEN RAISE EXCEPTION 'Disabled schedule still due'; END IF;
  IF has_function_privilege('authenticated','public.due_digest_slots(timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'Private schedules exposed'; END IF;
  IF has_function_privilege('authenticated','public.claim_email_batch()','EXECUTE') THEN RAISE EXCEPTION 'Private outbox exposed'; END IF;
END $$;
ROLLBACK;
