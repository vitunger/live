-- ============================================================
-- Spiritus v3.0 – Komplette DB Migration (from scratch)
-- Datum: 2026-03-07
-- Keine Vorgaenger-Tabellen noetig
-- ============================================================

-- ── 1. spiritus_transcripts (Haupttabelle) ──
CREATE TABLE IF NOT EXISTS spiritus_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id uuid REFERENCES standorte(id) ON DELETE SET NULL,
  standort_name text,
  call_date date NOT NULL DEFAULT CURRENT_DATE,
  call_type text DEFAULT 'beratung' CHECK (call_type IN ('beratung','review','onboarding','support','strategie')),
  contact text,
  transcript_text text,
  summary text,
  status text DEFAULT 'draft' CHECK (status IN ('draft','analyzing','done','error','verarbeitet','abgelehnt')),
  duration_min int,
  sentiment_level text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),

  -- v3: Kontext
  gespraechs_kontext text NOT NULL DEFAULT 'partner',
  lieferant_name text,
  akquise_kontakt_name text,
  akquise_kontakt_firma text,
  akquise_kontakt_ort text,
  akquise_kontakt_telefon text,
  akquise_kontakt_email text,

  -- v3: CRM-Anbindung
  crm_kontakt_id uuid,
  crm_deal_id uuid,
  anruf_richtung text,

  -- v3: Thema
  thema text,

  -- v3: 8-Felder-Protokoll (extern 1-6)
  protokoll_anlass text,
  protokoll_situation jsonb DEFAULT '[]'::jsonb,
  protokoll_fokus jsonb DEFAULT '[]'::jsonb,
  protokoll_massnahmen jsonb DEFAULT '[]'::jsonb,
  protokoll_ziel text,
  protokoll_review text,

  -- v3: 8-Felder-Protokoll (intern 7-8)
  protokoll_einschaetzung text,
  protokoll_beobachtung text,

  -- v3: Kategorie-Tags + Notizen
  kategorien text[] DEFAULT '{}',
  eigene_notizen text
);

CREATE INDEX IF NOT EXISTS idx_spiritus_transcripts_standort ON spiritus_transcripts(standort_id);
CREATE INDEX IF NOT EXISTS idx_spiritus_transcripts_date ON spiritus_transcripts(call_date DESC);
CREATE INDEX IF NOT EXISTS idx_spiritus_transcripts_kontext ON spiritus_transcripts(gespraechs_kontext);

ALTER TABLE spiritus_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HQ kann alle Transcripts lesen" ON spiritus_transcripts
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
CREATE POLICY "HQ kann Transcripts einfuegen" ON spiritus_transcripts
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
CREATE POLICY "HQ kann Transcripts updaten" ON spiritus_transcripts
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
CREATE POLICY "service_role_full_transcripts" ON spiritus_transcripts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 2. spiritus_extractions (KI-Extraktionen) ──
CREATE TABLE IF NOT EXISTS spiritus_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id uuid REFERENCES spiritus_transcripts(id) ON DELETE CASCADE,
  kategorie text NOT NULL CHECK (kategorie IN ('problem','massnahme','sentiment')),
  content text NOT NULL,
  confidence numeric(4,3) DEFAULT 0.7,
  data jsonb DEFAULT '{}',
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spiritus_extractions_transcript ON spiritus_extractions(transcript_id);

ALTER TABLE spiritus_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HQ kann Extraktionen lesen" ON spiritus_extractions
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
CREATE POLICY "service_role_full_extractions" ON spiritus_extractions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 3. spiritus_kb (Knowledge Base) ──
CREATE TABLE IF NOT EXISTS spiritus_kb (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_transcript_id uuid REFERENCES spiritus_transcripts(id) ON DELETE SET NULL,
  standort_id uuid REFERENCES standorte(id) ON DELETE SET NULL,
  content text NOT NULL,
  category text DEFAULT 'massnahme',
  auto_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spiritus_kb_approved ON spiritus_kb(auto_approved);

ALTER TABLE spiritus_kb ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HQ kann KB lesen" ON spiritus_kb
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));

-- ── 4. spiritus_ki_feedback (KI-Lernfaktor) ──
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

-- ── 6. 3CX/Teams Tabellen (Platzhalter) ──
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
