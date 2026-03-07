-- ============================================================
-- Einkauf v2 – Konditionen + Protokolle Migration
-- Datum: 2026-03-07
-- ============================================================

-- Konditionen-Felder fuer strukturierte DB1-Berechnung
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS kond_basis text;
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS kond_rabatt numeric(5,2);
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS kond_faktor numeric(4,2);
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS kond_kat_aufschlag numeric(5,2) DEFAULT 20;
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS kond_skonto numeric(4,2) DEFAULT 0;
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS kond_skonto_tage integer DEFAULT 0;
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS kond_wkz numeric(4,2) DEFAULT 0;
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS kond_zahlungsziel integer DEFAULT 30;
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS kond_remission numeric(4,2) DEFAULT 0;
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS kond_gueltig_ab date;
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS kond_notiz text;
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS netzwerk_umsatz numeric(12,2) DEFAULT 0;
ALTER TABLE lieferanten ADD COLUMN IF NOT EXISTS netzwerk_standorte integer DEFAULT 0;

-- Verhandlungsprotokolle
CREATE TABLE IF NOT EXISTS lieferanten_protokolle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lieferant_id uuid NOT NULL REFERENCES lieferanten(id) ON DELETE CASCADE,
  datum date NOT NULL DEFAULT CURRENT_DATE,
  kontakt_art text NOT NULL DEFAULT 'Telefonat',
  teilnehmer text,
  status_vorher text,
  status_nachher text,
  kond_vorher text,
  kond_nachher text,
  ergebnis text,
  naechster_schritt text,
  vollprotokoll text,
  erstellt_von uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lieferanten_protokolle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_all" ON lieferanten_protokolle FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
);
CREATE POLICY "service_role_full" ON lieferanten_protokolle FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lieferanten_protokolle_lief ON lieferanten_protokolle(lieferant_id);
CREATE INDEX IF NOT EXISTS idx_lieferanten_protokolle_datum ON lieferanten_protokolle(datum DESC);
