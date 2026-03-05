-- Performance Abfragen: HQ legt an, Partner füllen aus
CREATE TABLE IF NOT EXISTS einkauf_performance_abfragen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  zeitraum_aktuell TEXT NOT NULL,   -- z.B. "09/2024 – 08/2025"
  zeitraum_vorjahr TEXT NOT NULL,   -- z.B. "09/2023 – 08/2024"
  notiz TEXT,
  status TEXT NOT NULL DEFAULT 'offen',  -- 'offen' | 'geschlossen'
  erstellt_von UUID REFERENCES auth.users(id),
  erstellt_am TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE einkauf_performance_abfragen ENABLE ROW LEVEL SECURITY;

-- HQ darf alles
CREATE POLICY "HQ full access einkauf_performance_abfragen"
  ON einkauf_performance_abfragen FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));

-- Partner darf lesen (nur offene)
CREATE POLICY "Partner read einkauf_performance_abfragen"
  ON einkauf_performance_abfragen FOR SELECT
  USING (status = 'offen');

-- Performance Daten: je Standort + Abfrage eine Zeile pro Marke
CREATE TABLE IF NOT EXISTS einkauf_performance_daten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abfrage_id UUID NOT NULL REFERENCES einkauf_performance_abfragen(id) ON DELETE CASCADE,
  standort_id UUID NOT NULL REFERENCES standorte(id) ON DELETE CASCADE,
  marke TEXT NOT NULL,
  absatz_aktuell NUMERIC,
  absatz_vorjahr NUMERIC,
  umsatz_aktuell NUMERIC,   -- netto
  umsatz_vorjahr NUMERIC,   -- netto
  lager_stueck NUMERIC,
  lager_wert NUMERIC,       -- netto
  rabatt_aktuell NUMERIC,   -- brutto, optional
  rabatt_vorjahr NUMERIC,   -- brutto, optional
  rohertrag_aktuell NUMERIC, -- netto, optional
  rohertrag_vorjahr NUMERIC, -- netto, optional
  abgeschlossen BOOLEAN DEFAULT false,
  erstellt_am TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE einkauf_performance_daten ENABLE ROW LEVEL SECURITY;

-- HQ darf alles lesen
CREATE POLICY "HQ read all einkauf_performance_daten"
  ON einkauf_performance_daten FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));

-- Partner darf nur eigene lesen/schreiben
CREATE POLICY "Partner read own einkauf_performance_daten"
  ON einkauf_performance_daten FOR SELECT
  USING (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Partner insert own einkauf_performance_daten"
  ON einkauf_performance_daten FOR INSERT
  WITH CHECK (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Partner update own einkauf_performance_daten"
  ON einkauf_performance_daten FOR UPDATE
  USING (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()))
  WITH CHECK (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Partner delete own einkauf_performance_daten"
  ON einkauf_performance_daten FOR DELETE
  USING (
    standort_id = (SELECT standort_id FROM users WHERE id = auth.uid())
    AND abgeschlossen = false
  );

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_ekperf_daten_abfrage ON einkauf_performance_daten(abfrage_id);
CREATE INDEX IF NOT EXISTS idx_ekperf_daten_standort ON einkauf_performance_daten(standort_id);
