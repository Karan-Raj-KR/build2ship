-- ============================================================
-- MIGRATION: Payment, entitlements, and analytics tables
-- Run after the initial schema migration
-- ============================================================

-- Add admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Payment passes
CREATE TABLE IF NOT EXISTS payment_passes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_id text NOT NULL,
  order_id text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_passes_user_id ON payment_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_passes_status ON payment_passes(status);

-- AI usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  usage_type text NOT NULL CHECK (usage_type IN ('analysis', 'draft', 'extraction')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);

-- Analytics events (privacy-conscious: no content stored)
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_events_user_event ON analytics_events(user_id, event);

-- RLS policies
ALTER TABLE payment_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Payment passes: users can read their own
CREATE POLICY "Users can read own payment passes"
  ON payment_passes FOR SELECT
  USING (auth.uid() = user_id);

-- AI usage: users can read their own and insert their own
CREATE POLICY "Users can read own AI usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Analytics: users can read their own and insert their own
CREATE POLICY "Users can read own analytics events"
  ON analytics_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for webhooks and admin)
CREATE POLICY "Service role full access on payment_passes"
  ON payment_passes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on ai_usage"
  ON ai_usage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on analytics_events"
  ON analytics_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
