-- Migration: Meta Ads Token-Refresh Spalten
-- Fuegt access_token + token_expires_at zu ads_accounts hinzu
-- Ausfuehren im Supabase SQL Editor

ALTER TABLE ads_accounts
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Index fuer schnelle Token-Ablauf-Abfrage
CREATE INDEX IF NOT EXISTS idx_ads_accounts_token_expiry
  ON ads_accounts(token_expires_at)
  WHERE plattform = 'meta' AND ist_aktiv = true AND access_token IS NOT NULL;

-- Kommentar
COMMENT ON COLUMN ads_accounts.access_token IS 'Meta/Google long-lived access token (encrypted at rest by Supabase)';
COMMENT ON COLUMN ads_accounts.token_expires_at IS 'Ablaufdatum des Access Tokens';

-- RLS: access_token nur fuer service_role sichtbar (nicht im Frontend Select)
-- Die bestehende RLS Policy sollte bereits greifen.
-- Sicherheitshinweis: Frontend-Queries selecten nie access_token,
-- nur plattform/letzter_sync/sync_status/sync_fehler/account_id.

-- Optional: pg_cron Job (taeglich um 03:00 UTC)
-- SELECT cron.schedule(
--   'refresh-meta-tokens',
--   '0 3 * * *',
--   $$SELECT net.http_post(
--     url := 'https://lwwagbkxeofahhwebkab.supabase.co/functions/v1/refresh-meta-token',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', current_setting('app.settings.cron_secret')
--     ),
--     body := '{}'::jsonb
--   );$$
-- );
