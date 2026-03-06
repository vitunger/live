-- ============================================
-- Scompler Feature-Erweiterung – SQL Migration
-- Datum: 2026-03-06
-- Features: Kanal-Captions, TikTok Settings, Publish, Import
-- ============================================

-- Neue Felder fuer scompler_posts
ALTER TABLE scompler_posts
  ADD COLUMN IF NOT EXISTS kanal_captions JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tiktok_settings JSONB DEFAULT '{"privacy":"public","allow_duet":true,"allow_stitch":true,"allow_comment":true}',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publish_error TEXT;

-- Index fuer Import-Deduplizierung (platform_post_id Lookup)
CREATE INDEX IF NOT EXISTS idx_scompler_posts_platform_post_id
  ON scompler_posts(platform_post_id) WHERE platform_post_id IS NOT NULL;

-- Bestehende RLS-Policies greifen bereits fuer die neuen Felder
-- (keine neuen Tabellen, nur neue Spalten)
