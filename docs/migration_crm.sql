-- ============================================================
-- Migration: CRM-Tabellen fuer Vertrieb + Partnermanagement
-- Datum: 2026-03-07
-- Module: hqVertrieb, hqPartnermanagement
-- ============================================================

-- ── 1. crm_kontakte (Franchise-Interessenten Pipeline) ──

CREATE TABLE IF NOT EXISTS crm_kontakte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  typ TEXT NOT NULL DEFAULT 'interessent'
    CHECK (typ IN ('interessent', 'partner', 'ehemalig', 'gesperrt')),

  -- Stammdaten
  firmenname TEXT NOT NULL,
  inhaber TEXT,
  strasse TEXT,
  plz TEXT,
  stadt TEXT,
  bundesland TEXT,
  land TEXT DEFAULT 'DE',
  telefon TEXT,
  email TEXT,
  website TEXT,

  -- Pipeline (fuer typ='interessent')
  pipeline_phase TEXT DEFAULT 'lead'
    CHECK (pipeline_phase IN (
      'lead', 'erstgespraech', 'kennenlernen', 'qualifizierung',
      'training', 'gewonnen', 'verloren'
    )),
  pipeline_quelle TEXT,
  pipeline_score INT DEFAULT 0,
  pipeline_wert NUMERIC(10,2),
  pipeline_verloren_grund TEXT,

  -- Partner-Verknuepfung (nach Vertragsabschluss)
  standort_id UUID REFERENCES standorte(id),

  -- Potentialanalyse-Verknuepfung
  potential_check_id UUID REFERENCES potential_check_leads(id),

  -- HubSpot-Migration
  hubspot_deal_id BIGINT,

  -- Interne Felder
  interne_notizen TEXT,
  naechste_aktion TEXT,
  naechste_aktion_datum DATE,
  zustaendig UUID REFERENCES auth.users(id),
  letzter_kontakt TIMESTAMPTZ,

  erstellt_am TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am TIMESTAMPTZ DEFAULT now(),
  erstellt_von UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_crm_kontakte_typ ON crm_kontakte(typ);
CREATE INDEX IF NOT EXISTS idx_crm_kontakte_phase ON crm_kontakte(pipeline_phase);
CREATE INDEX IF NOT EXISTS idx_crm_kontakte_zustaendig ON crm_kontakte(zustaendig);
CREATE INDEX IF NOT EXISTS idx_crm_kontakte_hubspot ON crm_kontakte(hubspot_deal_id) WHERE hubspot_deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_kontakte_standort ON crm_kontakte(standort_id) WHERE standort_id IS NOT NULL;

-- ── 2. crm_aktivitaeten (Timeline) ──

CREATE TABLE IF NOT EXISTS crm_aktivitaeten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kontakt_id UUID NOT NULL REFERENCES crm_kontakte(id) ON DELETE CASCADE,
  typ TEXT NOT NULL CHECK (typ IN (
    'anruf', 'email', 'vor_ort', 'angebot_gesendet', 'lead_eingang',
    'phase_geaendert', 'notiz', 'sonstiges'
  )),
  zusammenfassung TEXT NOT NULL,
  details JSONB,
  teilnehmer TEXT[],
  datum TIMESTAMPTZ NOT NULL DEFAULT now(),
  erstellt_von UUID REFERENCES auth.users(id),
  erstellt_am TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_aktivitaeten_kontakt ON crm_aktivitaeten(kontakt_id);
CREATE INDEX IF NOT EXISTS idx_crm_aktivitaeten_datum ON crm_aktivitaeten(datum DESC);

-- ── 3. crm_vereinbarungen (Action Items / To-dos) ──

CREATE TABLE IF NOT EXISTS crm_vereinbarungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kontakt_id UUID NOT NULL REFERENCES crm_kontakte(id) ON DELETE CASCADE,
  aktivitaet_id UUID REFERENCES crm_aktivitaeten(id) ON DELETE SET NULL,
  beschreibung TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offen'
    CHECK (status IN ('offen', 'in_bearbeitung', 'erledigt', 'storniert')),
  prioritaet TEXT DEFAULT 'mittel'
    CHECK (prioritaet IN ('hoch', 'mittel', 'niedrig')),
  faellig_am DATE,
  verantwortlich TEXT,
  erledigt_am TIMESTAMPTZ,
  erstellt_am TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_vereinbarungen_kontakt ON crm_vereinbarungen(kontakt_id);
CREATE INDEX IF NOT EXISTS idx_crm_vereinbarungen_status ON crm_vereinbarungen(status);

-- ── 4. crm_meetings ──

CREATE TABLE IF NOT EXISTS crm_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kontakt_id UUID NOT NULL REFERENCES crm_kontakte(id) ON DELETE CASCADE,
  datum TIMESTAMPTZ NOT NULL,
  typ TEXT NOT NULL CHECK (typ IN (
    'Erstgespraech', 'Kennenlernen', 'Potentialanalyse',
    'Vertragsverhandlung', 'Coaching', 'Sonstiges'
  )),
  thema TEXT NOT NULL,
  ort TEXT,
  notizen TEXT,
  calendar_event_id TEXT,
  erstellt_von UUID REFERENCES auth.users(id),
  erstellt_am TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_meetings_kontakt ON crm_meetings(kontakt_id);
CREATE INDEX IF NOT EXISTS idx_crm_meetings_datum ON crm_meetings(datum DESC);

-- ── 5. crm_watchpoints (Partner-Beobachtungspunkte) ──

CREATE TABLE IF NOT EXISTS crm_watchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id UUID NOT NULL REFERENCES standorte(id) ON DELETE CASCADE,
  thema TEXT NOT NULL,
  prioritaet TEXT NOT NULL DEFAULT 'mittel'
    CHECK (prioritaet IN ('hoch', 'mittel', 'niedrig')),
  notiz TEXT,
  aktiv BOOLEAN DEFAULT true,
  erstellt_am TIMESTAMPTZ DEFAULT now(),
  geloest_am TIMESTAMPTZ,
  erstellt_von UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_crm_watchpoints_standort ON crm_watchpoints(standort_id);
CREATE INDEX IF NOT EXISTS idx_crm_watchpoints_aktiv ON crm_watchpoints(aktiv) WHERE aktiv = true;

-- ── 6. standorte erweitern: Partner-Ampel ──

ALTER TABLE standorte ADD COLUMN IF NOT EXISTS partner_status TEXT DEFAULT 'gruen'
  CHECK (partner_status IN ('gruen', 'gelb', 'rot'));
ALTER TABLE standorte ADD COLUMN IF NOT EXISTS partner_status_kommentar TEXT;

-- ══════════════════════════════════════════════════
-- RLS Policies (alle crm_*: nur HQ)
-- ══════════════════════════════════════════════════

ALTER TABLE crm_kontakte ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_aktivitaeten ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_vereinbarungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_watchpoints ENABLE ROW LEVEL SECURITY;

-- crm_kontakte
CREATE POLICY "hq_full_access" ON crm_kontakte FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
);
CREATE POLICY "service_role_full" ON crm_kontakte FOR ALL TO service_role USING (true) WITH CHECK (true);

-- crm_aktivitaeten
CREATE POLICY "hq_full_access" ON crm_aktivitaeten FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
);
CREATE POLICY "service_role_full" ON crm_aktivitaeten FOR ALL TO service_role USING (true) WITH CHECK (true);

-- crm_vereinbarungen
CREATE POLICY "hq_full_access" ON crm_vereinbarungen FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
);
CREATE POLICY "service_role_full" ON crm_vereinbarungen FOR ALL TO service_role USING (true) WITH CHECK (true);

-- crm_meetings
CREATE POLICY "hq_full_access" ON crm_meetings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
);
CREATE POLICY "service_role_full" ON crm_meetings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- crm_watchpoints
CREATE POLICY "hq_full_access" ON crm_watchpoints FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
);
CREATE POLICY "service_role_full" ON crm_watchpoints FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════
-- Trigger: aktualisiert_am auto-update
-- ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_crm_kontakte_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.aktualisiert_am = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_crm_kontakte_updated
  BEFORE UPDATE ON crm_kontakte
  FOR EACH ROW EXECUTE FUNCTION update_crm_kontakte_updated_at();

-- ══════════════════════════════════════════════════
-- Trigger: Phase-Aenderung → Aktivitaet loggen
-- ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_crm_phase_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.pipeline_phase IS DISTINCT FROM NEW.pipeline_phase THEN
    INSERT INTO crm_aktivitaeten (kontakt_id, typ, zusammenfassung, details, erstellt_von)
    VALUES (
      NEW.id,
      'phase_geaendert',
      'Phase: ' || COALESCE(OLD.pipeline_phase, '-') || ' \u2192 ' || COALESCE(NEW.pipeline_phase, '-'),
      jsonb_build_object('alte_phase', OLD.pipeline_phase, 'neue_phase', NEW.pipeline_phase),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_crm_phase_change
  AFTER UPDATE ON crm_kontakte
  FOR EACH ROW EXECUTE FUNCTION log_crm_phase_change();

-- ══════════════════════════════════════════════════
-- Trigger: Neue Aktivitaet → letzter_kontakt aktualisieren
-- ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_crm_letzter_kontakt()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE crm_kontakte
  SET letzter_kontakt = NEW.datum
  WHERE id = NEW.kontakt_id
    AND (letzter_kontakt IS NULL OR letzter_kontakt < NEW.datum);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_crm_letzter_kontakt
  AFTER INSERT ON crm_aktivitaeten
  FOR EACH ROW EXECUTE FUNCTION update_crm_letzter_kontakt();

-- ══════════════════════════════════════════════════
-- View: Partner Health Dashboard
-- ══════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_partner_health AS
SELECT
  s.id,
  s.name,
  s.inhaber_name,
  s.region,
  s.partner_status,
  s.partner_status_kommentar,
  s.is_premium,
  s.billing_status,
  s.status,
  (SELECT COUNT(*) FROM support_tickets t
   WHERE t.standort_id = s.id AND t.status IN ('offen', 'in_bearbeitung')) AS offene_tickets,
  (SELECT COUNT(*) FROM crm_watchpoints w
   WHERE w.standort_id = s.id AND w.aktiv = true AND w.prioritaet = 'hoch') AS kritische_watchpoints,
  (SELECT stimmung FROM partner_journal pj
   WHERE pj.standort_id = s.id ORDER BY pj.datum DESC LIMIT 1) AS letzte_stimmung,
  (SELECT COUNT(*) FROM partner_jahresziele pz
   WHERE pz.standort_id = s.id AND pz.status = 'gefaehrdet') AS gefaehrdete_ziele
FROM standorte s
WHERE s.status = 'aktiv' AND s.is_demo = false
ORDER BY
  CASE s.partner_status WHEN 'rot' THEN 1 WHEN 'gelb' THEN 2 ELSE 3 END,
  s.name;

-- ══════════════════════════════════════════════════
-- modul_status Eintraege
-- ══════════════════════════════════════════════════

INSERT INTO modul_status (modul_key, modul_name, kategorie, status, ebene, hq_status, config, hq_config)
VALUES
  ('hqVertrieb', 'Vertrieb', 'hq_netzwerk', 'inaktiv', 'hq', 'beta', '{}',
   '{"tabs": {"dashboard": "beta", "inbox": "beta", "pipeline": "beta"}}'),
  ('hqPartnermanagement', 'Partnermanagement', 'hq_netzwerk', 'inaktiv', 'hq', 'beta', '{}',
   '{"tabs": {"uebersicht": "beta", "detail": "beta"}}')
ON CONFLICT (modul_key) DO NOTHING;

-- hqStandorte wird durch Partnermanagement ersetzt
UPDATE modul_status SET hq_status = 'deaktiviert' WHERE modul_key = 'hqStandorte';
