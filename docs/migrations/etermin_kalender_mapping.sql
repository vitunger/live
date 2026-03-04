-- Migration: eTermin Kalender → Verkäufer Mapping
-- Datum: 2026-03-04

-- 1. Neue Tabelle: Kalender → Verkäufer Zuordnung
CREATE TABLE IF NOT EXISTS etermin_kalender_mapping (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    standort_id uuid REFERENCES standorte(id) ON DELETE CASCADE,
    etermin_kalender_id text,           -- Kalender-ID aus eTermin (z.B. "12345")
    etermin_kalender_name text NOT NULL, -- Kalender-Name aus eTermin (z.B. "Max Mustermann")
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(standort_id, etermin_kalender_name)
);

-- 2. Neue Spalten in termine Tabelle
ALTER TABLE termine
    ADD COLUMN IF NOT EXISTS etermin_kalender_id text,
    ADD COLUMN IF NOT EXISTS etermin_kalender_name text,
    ADD COLUMN IF NOT EXISTS zugewiesen_an uuid REFERENCES users(id) ON DELETE SET NULL;

-- 3. Index für performante Lookups
CREATE INDEX IF NOT EXISTS idx_etermin_kalender_mapping_standort ON etermin_kalender_mapping(standort_id);
CREATE INDEX IF NOT EXISTS idx_etermin_kalender_mapping_kalender_id ON etermin_kalender_mapping(etermin_kalender_id);
CREATE INDEX IF NOT EXISTS idx_termine_zugewiesen_an ON termine(zugewiesen_an);
CREATE INDEX IF NOT EXISTS idx_termine_etermin_kalender_id ON termine(etermin_kalender_id);

-- 4. RLS Policies
ALTER TABLE etermin_kalender_mapping ENABLE ROW LEVEL SECURITY;

-- HQ kann alles sehen und bearbeiten
CREATE POLICY "hq_full_access_etermin_kalender_mapping"
    ON etermin_kalender_mapping
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
    );

-- Partner sehen nur ihre eigenen Standort-Mappings
CREATE POLICY "partner_read_own_etermin_kalender_mapping"
    ON etermin_kalender_mapping
    FOR SELECT
    TO authenticated
    USING (
        standort_id IN (
            SELECT standort_id FROM users WHERE id = auth.uid() AND is_hq = false
        )
    );

-- 5. Backfill: Bestehende eTermin-Termine: etermin_kalender_name aus ort-Feld übernehmen
-- (da bisher CALENDARNAME in ort gespeichert wurde)
UPDATE termine
SET etermin_kalender_name = ort
WHERE quelle = 'etermin'
  AND ort IS NOT NULL
  AND ort != ''
  AND etermin_kalender_name IS NULL;

