-- ============================================================
-- Spiritus Modul – Datenbankschema
-- Ausführen in: Supabase SQL Editor
-- ============================================================

-- 1. Transkripte (ein Eintrag pro Call)
CREATE TABLE IF NOT EXISTS spiritus_transcripts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standort_id     UUID REFERENCES standorte(id) ON DELETE SET NULL,
    standort_name   TEXT,
    call_date       DATE NOT NULL,
    call_type       TEXT DEFAULT 'Sonstiges',
    duration_min    INTEGER,
    transcript_text TEXT,
    summary         TEXT,
    sentiment_level TEXT CHECK (sentiment_level IN ('positiv', 'neutral', 'angespannt')),
    call_themen     TEXT[] DEFAULT '{}',
    audio_path      TEXT,           -- Supabase Storage Pfad
    status          TEXT NOT NULL DEFAULT 'review'
                        CHECK (status IN ('in_progress', 'review', 'verarbeitet', 'abgelehnt', 'fehler')),
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Extraktionen (Probleme, Maßnahmen, Sentiment je Transkript)
CREATE TABLE IF NOT EXISTS spiritus_extractions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id   UUID NOT NULL REFERENCES spiritus_transcripts(id) ON DELETE CASCADE,
    standort_id     UUID REFERENCES standorte(id) ON DELETE SET NULL,
    kategorie       TEXT NOT NULL CHECK (kategorie IN ('problem', 'massnahme', 'sentiment')),
    content         TEXT NOT NULL,
    confidence      FLOAT DEFAULT 0.7,
    keywords        TEXT[] DEFAULT '{}',
    approved        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indizes
CREATE INDEX IF NOT EXISTS idx_spiritus_transcripts_standort ON spiritus_transcripts(standort_id);
CREATE INDEX IF NOT EXISTS idx_spiritus_transcripts_date     ON spiritus_transcripts(call_date DESC);
CREATE INDEX IF NOT EXISTS idx_spiritus_transcripts_status   ON spiritus_transcripts(status);
CREATE INDEX IF NOT EXISTS idx_spiritus_extractions_transcript ON spiritus_extractions(transcript_id);
CREATE INDEX IF NOT EXISTS idx_spiritus_extractions_approved  ON spiritus_extractions(approved) WHERE approved = TRUE;

-- 4. updated_at Trigger
CREATE OR REPLACE FUNCTION update_spiritus_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_spiritus_updated_at ON spiritus_transcripts;
CREATE TRIGGER trg_spiritus_updated_at
    BEFORE UPDATE ON spiritus_transcripts
    FOR EACH ROW EXECUTE FUNCTION update_spiritus_updated_at();

-- 5. RLS
ALTER TABLE spiritus_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spiritus_extractions ENABLE ROW LEVEL SECURITY;

-- Nur HQ darf lesen/schreiben
CREATE POLICY "spiritus_hq_all" ON spiritus_transcripts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = TRUE)
    );

CREATE POLICY "spiritus_extractions_hq_all" ON spiritus_extractions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = TRUE)
    );

-- 6. Ansicht: approved Extractions (für KI-Trainer)
CREATE OR REPLACE VIEW spiritus_knowledge AS
SELECT
    e.id,
    e.kategorie,
    e.content,
    e.confidence,
    e.keywords,
    t.standort_name,
    t.call_date,
    t.sentiment_level,
    t.summary
FROM spiritus_extractions e
JOIN spiritus_transcripts t ON e.transcript_id = t.id
WHERE e.approved = TRUE
  AND t.status = 'verarbeitet';

-- Kommentar
COMMENT ON TABLE spiritus_transcripts IS 'Call-Protokolle (Spiritus Modul) – Gespräche zwischen HQ und Standorten';
COMMENT ON TABLE spiritus_extractions IS 'KI-extrahierte Erkenntnisse aus Spiritus-Calls (Probleme, Maßnahmen, Sentiment)';
COMMENT ON VIEW  spiritus_knowledge   IS 'Freigegebene Erkenntnisse für den KI-Trainer (Wissensbasis)';
