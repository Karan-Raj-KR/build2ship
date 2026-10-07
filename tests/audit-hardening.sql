-- Run only on an isolated test database with 001 and 002 installed, as neondb_owner.
-- All generated fixtures are rolled back. psql -v ON_ERROR_STOP=1 -f tests/audit-hardening.sql
BEGIN;
DO $$
DECLARE a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  private_opp uuid; shared_opp uuid; usage_id uuid; rejected boolean;
BEGIN
  IF current_user <> 'neondb_owner' THEN RAISE EXCEPTION 'Use the isolated schema owner'; END IF;
  IF has_table_privilege('authenticated','public.profiles','DELETE') THEN RAISE EXCEPTION 'Client profile deletion enabled'; END IF;
  IF has_table_privilege('authenticated','public.ai_usage','INSERT') THEN RAISE EXCEPTION 'Client usage forgery enabled'; END IF;
  IF has_function_privilege('authenticated','public.reserve_ai_usage(uuid,text,integer,integer)','EXECUTE') THEN RAISE EXCEPTION 'Client quota reservation enabled'; END IF;
  INSERT INTO accounts(id,email) VALUES(a,'audit-a@example.invalid'),(b,'audit-b@example.invalid');
  INSERT INTO profiles(id,is_suspended) VALUES(a,false),(b,true);
  usage_id := reserve_ai_usage(a,'analysis',1,2);
  IF usage_id IS NULL THEN RAISE EXCEPTION 'First free reservation denied'; END IF;
  IF reserve_ai_usage(a,'analysis',1,2) IS NOT NULL THEN RAISE EXCEPTION 'Monthly allowance bypassed'; END IF;
  IF reserve_ai_usage(a,'draft',1,2) IS NULL THEN RAISE EXCEPTION 'Separate draft allowance denied'; END IF;
  INSERT INTO payment_passes(user_id,payment_id,order_id,amount,currency,expires_at,status)
    VALUES(a,'audit-'||a,'audit-'||a,900,'USD',now()+interval '30 days','active');
  IF reserve_ai_usage(a,'analysis',1,2) IS NULL THEN RAISE EXCEPTION 'Paid allowance denied'; END IF;
  IF reserve_ai_usage(a,'analysis',1,2) IS NOT NULL THEN RAISE EXCEPTION 'Paid allowance bypassed'; END IF;
  INSERT INTO ai_usage(user_id,usage_type) SELECT a,'analysis' FROM generate_series(1,20);
  IF reserve_ai_usage(a,'draft',100,100) IS NOT NULL THEN RAISE EXCEPTION 'Minute rate limit bypassed'; END IF;
  rejected := false;
  BEGIN PERFORM reserve_ai_usage(b,'analysis',1,2); EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Suspended account reserved usage'; END IF;
  -- Both an unshared private draft and shared published source must be cleaned.
  INSERT INTO opportunities(created_by,title,status,source_content,source_evidence)
    VALUES(a,'Private audit draft','draft','private background','private evidence') RETURNING id INTO private_opp;
  INSERT INTO opportunities(created_by,title,status,publication_status,source_content,source_evidence)
    VALUES(a,'Shared audit listing','published','published','private background','private evidence') RETURNING id INTO shared_opp;
  INSERT INTO applications(user_id,opportunity_id,stage) VALUES(a,private_opp,'saved'),(b,shared_opp,'saved');
  DELETE FROM accounts WHERE id=a;
  IF EXISTS(SELECT 1 FROM opportunities WHERE id=private_opp) THEN RAISE EXCEPTION 'Private draft retained'; END IF;
  IF NOT EXISTS(SELECT 1 FROM opportunities WHERE id=shared_opp AND created_by IS NULL AND source_content IS NULL AND source_evidence IS NULL) THEN RAISE EXCEPTION 'Shared source not sanitized'; END IF;
  IF NOT EXISTS(SELECT 1 FROM applications WHERE user_id=b AND opportunity_id=shared_opp) THEN RAISE EXCEPTION 'Other account work removed'; END IF;
  IF EXISTS(SELECT 1 FROM profiles WHERE id=a) OR EXISTS(SELECT 1 FROM ai_usage WHERE user_id=a) THEN RAISE EXCEPTION 'Account data not cascaded'; END IF;
END $$;
ROLLBACK;
