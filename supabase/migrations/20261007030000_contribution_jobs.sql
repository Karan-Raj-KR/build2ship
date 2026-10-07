-- Full-auto metadata only. Code runs on the student's machine, never this server.
CREATE TABLE public.contribution_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  repo text NOT NULL,
  number integer NOT NULL CHECK (number > 0),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','running','review','approved','opening','done','failed','cancelled','expired')),
  token_hash text NOT NULL,
  signoff boolean NOT NULL DEFAULT false,
  legal jsonb NOT NULL DEFAULT '[]',
  result jsonb NOT NULL DEFAULT '{}',
  events jsonb NOT NULL DEFAULT '[]',
  pr_title text NOT NULL DEFAULT '',
  pr_body text NOT NULL DEFAULT '',
  pr_url text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '6 hours'
);
CREATE UNIQUE INDEX contribution_jobs_one_active ON public.contribution_jobs(user_id)
 WHERE status IN ('ready','running','review','approved','opening');
CREATE INDEX contribution_jobs_user_created ON public.contribution_jobs(user_id,created_at DESC);
ALTER TABLE public.contribution_jobs ENABLE ROW LEVEL SECURITY;
-- Browser clients may only read their jobs. All mutations go through validated server routes.
CREATE POLICY contribution_jobs_read_own ON public.contribution_jobs FOR SELECT TO authenticated USING (user_id=auth.uid());
REVOKE ALL ON public.contribution_jobs FROM anon, authenticated;
-- Token verifiers and reports are only exposed through owner-filtered server APIs.
GRANT ALL ON public.contribution_jobs TO service_role;
