-- Apply before deploying the AI quota and account fixes. Safe to re-run.
BEGIN;
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
COMMIT;
