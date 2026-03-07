-- ============================================
-- BUCHUNGSSYSTEM + MS365 INTEGRATION
-- Migration: buchungssystem_ms365_v1
-- Ausfuehren: Supabase SQL Editor (manuell)
-- ============================================

-- MS365-Verbindung pro HQ-Mitarbeiter (in users-Tabelle)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ms365_email TEXT,
  ADD COLUMN IF NOT EXISTS ms365_access_token TEXT,
  ADD COLUMN IF NOT EXISTS ms365_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS ms365_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ms365_verbunden_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ms365_scope TEXT;

-- Termintypen (konfigurierbar von HQ)
CREATE TABLE IF NOT EXISTS hq_termintypen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  beschreibung TEXT,
  dauer_min INT NOT NULL DEFAULT 30,
  puffer_min INT NOT NULL DEFAULT 10,
  farbe TEXT DEFAULT '#EF7D00',
  max_pro_tag INT,
  vorlaufzeit_h INT DEFAULT 24,
  teams_meeting BOOLEAN DEFAULT true,
  aktiv BOOLEAN DEFAULT true,
  erstellt_von UUID REFERENCES users(id),
  erstellt_at TIMESTAMPTZ DEFAULT NOW()
);

-- Standard-Termintypen einfuegen
INSERT INTO hq_termintypen (name, beschreibung, dauer_min, puffer_min, farbe, vorlaufzeit_h) VALUES
  ('Finanz-Review', 'Monatliche BWA-Besprechung und Planung', 60, 15, '#EF7D00', 48),
  ('IT-Support-Call', 'Technische Fragen und Portal-Support', 30, 10, '#3B82F6', 4),
  ('Strategie-Gespraech', 'Quartalsplanung und Netzwerk-Updates', 45, 15, '#10B981', 72),
  ('Erstgespraech', 'Onboarding und Kennenlernen', 60, 15, '#8B5CF6', 24),
  ('Schnelle Frage', 'Kurzer 15-Minuten-Slot', 15, 5, '#6B7280', 2)
ON CONFLICT DO NOTHING;

-- Verfuegbarkeit (Wochenmuster pro HQ-User)
CREATE TABLE IF NOT EXISTS hq_verfuegbarkeit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wochentag SMALLINT NOT NULL CHECK (wochentag BETWEEN 0 AND 4), -- 0=Mo...4=Fr
  start_zeit TIME NOT NULL,
  end_zeit TIME NOT NULL,
  gueltig_ab DATE DEFAULT CURRENT_DATE,
  gueltig_bis DATE,
  UNIQUE(user_id, wochentag, start_zeit)
);

-- Sperrzeiten (Urlaub, Feiertage, manuell blockiert)
CREATE TABLE IF NOT EXISTS hq_sperrzeiten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  von TIMESTAMPTZ NOT NULL,
  bis TIMESTAMPTZ NOT NULL,
  grund TEXT,
  erstellt_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persoenliche Buchungslinks
CREATE TABLE IF NOT EXISTS hq_buchungslinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  termintyp_id UUID REFERENCES hq_termintypen(id),
  slug TEXT UNIQUE NOT NULL,
  titel TEXT,
  beschreibung TEXT,
  aktiv BOOLEAN DEFAULT true,
  ablauf_at TIMESTAMPTZ,
  max_buchungen INT,
  buchungen_count INT DEFAULT 0,
  erstellt_at TIMESTAMPTZ DEFAULT NOW()
);

-- Haupttabelle Buchungen
CREATE TABLE IF NOT EXISTS hq_buchungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buchungs_nr TEXT UNIQUE,
  termintyp_id UUID REFERENCES hq_termintypen(id),
  buchungslink_id UUID REFERENCES hq_buchungslinks(id),
  hq_user_id UUID NOT NULL REFERENCES users(id),
  standort_id UUID REFERENCES standorte(id),
  partner_user_id UUID REFERENCES users(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  thema TEXT,
  notizen TEXT,
  status TEXT NOT NULL DEFAULT 'ausstehend'
    CHECK (status IN ('ausstehend','bestaetigt','abgelehnt','abgesagt','abgeschlossen')),
  absage_grund TEXT,
  -- MS365 Integration
  ms365_event_id TEXT,
  ms365_teams_link TEXT,
  ms365_sharepoint_folder TEXT,
  -- Self-Service
  ics_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  -- Erinnerungen
  erinnerung_24h_gesendet BOOLEAN DEFAULT false,
  erinnerung_1h_gesendet BOOLEAN DEFAULT false,
  erstellt_at TIMESTAMPTZ DEFAULT NOW(),
  aktualisiert_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buchungsnummer automatisch vergeben
CREATE SEQUENCE IF NOT EXISTS buchungs_nr_seq START 1;

CREATE OR REPLACE FUNCTION generate_buchungs_nr()
RETURNS TRIGGER AS $$
BEGIN
  NEW.buchungs_nr := 'BK-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(NEXTVAL('buchungs_nr_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_buchungs_nr ON hq_buchungen;
CREATE TRIGGER set_buchungs_nr
  BEFORE INSERT ON hq_buchungen
  FOR EACH ROW WHEN (NEW.buchungs_nr IS NULL)
  EXECUTE FUNCTION generate_buchungs_nr();

-- Indizes
CREATE INDEX IF NOT EXISTS idx_hq_buchungen_hq_user ON hq_buchungen(hq_user_id);
CREATE INDEX IF NOT EXISTS idx_hq_buchungen_standort ON hq_buchungen(standort_id);
CREATE INDEX IF NOT EXISTS idx_hq_buchungen_start ON hq_buchungen(start_at);
CREATE INDEX IF NOT EXISTS idx_hq_buchungen_status ON hq_buchungen(status);
CREATE INDEX IF NOT EXISTS idx_hq_buchungen_ics_token ON hq_buchungen(ics_token);
CREATE INDEX IF NOT EXISTS idx_hq_verfuegbarkeit_user ON hq_verfuegbarkeit(user_id);
CREATE INDEX IF NOT EXISTS idx_hq_sperrzeiten_user_von ON hq_sperrzeiten(user_id, von, bis);

-- RLS aktivieren
ALTER TABLE hq_termintypen ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_verfuegbarkeit ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_sperrzeiten ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_buchungslinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_buchungen ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Termintypen
CREATE POLICY "Alle authentifizierten User lesen Termintypen"
  ON hq_termintypen FOR SELECT TO authenticated USING (true);
CREATE POLICY "Nur HQ erstellt/aendert Termintypen"
  ON hq_termintypen FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));

-- RLS Policies: Verfuegbarkeit
CREATE POLICY "HQ sieht alle Verfuegbarkeiten"
  ON hq_verfuegbarkeit FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
CREATE POLICY "Partner sieht Verfuegbarkeit fuer Buchung"
  ON hq_verfuegbarkeit FOR SELECT TO authenticated USING (true);
CREATE POLICY "Jeder HQ-User verwaltet eigene Verfuegbarkeit"
  ON hq_verfuegbarkeit FOR ALL TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));

-- RLS Policies: Sperrzeiten
CREATE POLICY "HQ verwaltet eigene Sperrzeiten"
  ON hq_sperrzeiten FOR ALL TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
CREATE POLICY "Partner sieht Sperrzeiten fuer Slot-Berechnung"
  ON hq_sperrzeiten FOR SELECT TO authenticated USING (true);

-- RLS Policies: Buchungslinks
CREATE POLICY "HQ verwaltet eigene Buchungslinks"
  ON hq_buchungslinks FOR ALL TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
CREATE POLICY "Partner sieht aktive Buchungslinks"
  ON hq_buchungslinks FOR SELECT TO authenticated USING (aktiv = true);

-- RLS Policies: Buchungen
CREATE POLICY "HQ sieht alle Buchungen"
  ON hq_buchungen FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
CREATE POLICY "Partner sieht eigene Standort-Buchungen"
  ON hq_buchungen FOR SELECT TO authenticated
  USING (
    partner_user_id = auth.uid() OR
    standort_id IN (SELECT standort_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "Partner erstellt Buchungen"
  ON hq_buchungen FOR INSERT TO authenticated
  WITH CHECK (partner_user_id = auth.uid());
CREATE POLICY "HQ aktualisiert Buchungen"
  ON hq_buchungen FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));

-- service_role fuer Edge Functions
CREATE POLICY "Service Role voll Zugriff hq_buchungen"
  ON hq_buchungen FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role voll Zugriff hq_termintypen"
  ON hq_termintypen FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role voll Zugriff hq_verfuegbarkeit"
  ON hq_verfuegbarkeit FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role voll Zugriff hq_sperrzeiten"
  ON hq_sperrzeiten FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role voll Zugriff hq_buchungslinks"
  ON hq_buchungslinks FOR ALL TO service_role USING (true) WITH CHECK (true);
