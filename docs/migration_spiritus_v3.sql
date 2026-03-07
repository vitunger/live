-- ============================================================
-- Spiritus v3.0 – DB Migration
-- Datum: 2026-03-07
-- Voraussetzung: spiritus_migration.sql wurde bereits ausgefuehrt
--   (spiritus_calls, spiritus_extractions, spiritus_kb existieren)
-- ============================================================

-- ── 0. Basistabelle umbenennen: spiritus_calls → spiritus_transcripts ──
ALTER TABLE IF EXISTS spiritus_calls RENAME TO spiritus_transcripts;

-- Indizes umbenennen (optional, funktional egal)
ALTER INDEX IF EXISTS idx_spiritus_calls_standort RENAME TO idx_spiritus_transcripts_standort;
ALTER INDEX IF EXISTS idx_spiritus_calls_date RENAME TO idx_spiritus_transcripts_date;

-- spiritus_extractions: call_id → transcript_id
ALTER TABLE spiritus_extractions RENAME COLUMN call_id TO transcript_id;

-- spiritus_extractions: type → kategorie (Code erwartet 'kategorie')
ALTER TABLE spiritus_extractions RENAME COLUMN type TO kategorie;

-- spiritus_kb: source_call_id → source_transcript_id
ALTER TABLE spiritus_kb RENAME COLUMN source_call_id TO source_transcript_id;

-- ── 0b. Fehlende Basisspalten auf spiritus_transcripts ──
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS standort_name text;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS duration_min int;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS sentiment_level text;

-- ── 1. Neuer Enum: gespraechs_kontext ──
DO $$ BEGIN
  CREATE TYPE gespraechs_kontext AS ENUM ('partner', 'lieferant', 'akquise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. spiritus_transcripts erweitern ──

-- Kontext-Typ (Default: partner fuer Abwaertskompatibilitaet)
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS gespraechs_kontext text NOT NULL DEFAULT 'partner';

-- standort_id nullable machen (Lieferant/Akquise haben keinen Standort)
ALTER TABLE spiritus_transcripts ALTER COLUMN standort_id DROP NOT NULL;

-- Neue Felder fuer nicht-Partner-Kontexte
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS lieferant_name text;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS akquise_kontakt_name text;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS akquise_kontakt_firma text;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS akquise_kontakt_ort text;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS akquise_kontakt_telefon text;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS akquise_kontakt_email text;

-- CRM-Anbindung (optional, fuer spaetere Integration)
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS crm_kontakt_id uuid;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS crm_deal_id uuid;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS anruf_richtung text;

-- Thema-Feld
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS thema text;

-- 8-Felder-Protokoll (extern)
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS protokoll_anlass text;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS protokoll_situation jsonb DEFAULT '[]'::jsonb;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS protokoll_fokus jsonb DEFAULT '[]'::jsonb;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS protokoll_massnahmen jsonb DEFAULT '[]'::jsonb;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS protokoll_ziel text;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS protokoll_review text;

-- 8-Felder-Protokoll (intern)
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS protokoll_einschaetzung text;
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS protokoll_beobachtung text;

-- Kategorie-Tags fuer systemweite Analyse
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS kategorien text[] DEFAULT '{}';

-- Eigene Notizen (Freitext, nicht KI)
ALTER TABLE spiritus_transcripts ADD COLUMN IF NOT EXISTS eigene_notizen text;

-- ── 3. Indizes ──
CREATE INDEX IF NOT EXISTS idx_spiritus_transcripts_kontext ON spiritus_transcripts(gespraechs_kontext);

-- ── 4. KI-Lernfaktor: Feedback-Tabelle ──
CREATE TABLE IF NOT EXISTS spiritus_ki_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id uuid NOT NULL REFERENCES spiritus_transcripts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  feld text NOT NULL,
  ki_original jsonb NOT NULL,
  user_final jsonb NOT NULL,
  gespraechs_kontext text NOT NULL DEFAULT 'partner',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE spiritus_ki_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_all" ON spiritus_ki_feedback FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
);
CREATE POLICY "service_role_full" ON spiritus_ki_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_spiritus_ki_feedback_kontext ON spiritus_ki_feedback(gespraechs_kontext);
CREATE INDEX IF NOT EXISTS idx_spiritus_ki_feedback_transcript ON spiritus_ki_feedback(transcript_id);

-- ── 5. Todo-Bridge ──
ALTER TABLE todos ADD COLUMN IF NOT EXISTS spiritus_transcript_id uuid REFERENCES spiritus_transcripts(id);
CREATE INDEX IF NOT EXISTS idx_todos_spiritus ON todos(spiritus_transcript_id) WHERE spiritus_transcript_id IS NOT NULL;

-- ── 6. 3CX/Teams Tabellen (Platzhalter fuer spaetere Integration) ──
CREATE TABLE IF NOT EXISTS spiritus_3cx_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id uuid REFERENCES standorte(id),
  extension_number text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  display_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(extension_number)
);

ALTER TABLE spiritus_3cx_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_all" ON spiritus_3cx_mapping FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
);

CREATE TABLE IF NOT EXISTS spiritus_teams_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL UNIQUE,
  client_id text NOT NULL,
  subscription_id text,
  subscription_expiry timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE spiritus_teams_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_all" ON spiritus_teams_config FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
);

CREATE TABLE IF NOT EXISTS spiritus_live_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id text,
  extension text,
  user_id uuid REFERENCES auth.users(id),
  standort_id uuid REFERENCES standorte(id),
  source text NOT NULL,
  call_direction text,
  status text DEFAULT 'ringing',
  spiritus_aktiv boolean DEFAULT false,
  transcript_id uuid REFERENCES spiritus_transcripts(id),
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE spiritus_live_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_all" ON spiritus_live_calls FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
);

-- Realtime fuer Live-Call Pop-ups
ALTER PUBLICATION supabase_realtime ADD TABLE spiritus_live_calls;
