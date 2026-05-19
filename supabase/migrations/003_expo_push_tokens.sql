-- =====================================================
-- Migration 003: Mobile push tokens (Expo)
-- =====================================================
-- Web app uses Web Push API (VAPID) via the push_subscriptions table.
-- Mobile (Expo) uses Expo Push Tokens which are formatted differently
-- and delivered via https://exp.host/--/api/v2/push/send.
-- Stored separately to avoid schema gymnastics.
-- =====================================================

CREATE TABLE IF NOT EXISTS expo_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_name TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expo_tokens_user ON expo_push_tokens(user_id);

ALTER TABLE expo_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own expo tokens"
  ON expo_push_tokens FOR ALL
  USING (auth.uid() = user_id);
