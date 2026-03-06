-- ============================================================
-- Support-Ticketsystem Migration
-- Erstellt: 2026-03-06
-- ============================================================

-- 1. HAUPT-TABELLE
CREATE TABLE IF NOT EXISTS support_tickets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_nr           TEXT UNIQUE,
  standort_id         UUID REFERENCES standorte(id) ON DELETE SET NULL,
  erstellt_von        UUID REFERENCES users(id) ON DELETE SET NULL,
  assignee_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  richtung            TEXT DEFAULT 'partner_zu_hq' CHECK (richtung IN ('partner_zu_hq','hq_zu_partner','hq_intern')),
  kategorie           TEXT CHECK (kategorie IN ('IT','Abrechnung','Marketing','Allgemein','Sonstiges')),
  betreff             TEXT NOT NULL,
  beschreibung        TEXT NOT NULL,
  status              TEXT DEFAULT 'offen' CHECK (status IN ('offen','in_bearbeitung','wartend_auf_partner','geloest','geschlossen')),
  prioritaet          TEXT DEFAULT 'mittel' CHECK (prioritaet IN ('niedrig','mittel','kritisch')),
  sla_stunden         INT DEFAULT 48,
  sla_pausiert_seit   TIMESTAMPTZ,
  erste_antwort_at    TIMESTAMPTZ,
  geloest_at          TIMESTAMPTZ,
  wiedereroeffnet_at  TIMESTAMPTZ,
  csat_bewertung      SMALLINT CHECK (csat_bewertung BETWEEN 1 AND 5),
  csat_kommentar      TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Auto-Ticket-Nummer Funktion
CREATE OR REPLACE FUNCTION generate_ticket_nr()
RETURNS TRIGGER AS $$
DECLARE
  jahr TEXT := to_char(now(), 'YYYY');
  seq  INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(ticket_nr, '-', 3) AS INT)), 0) + 1
    INTO seq FROM support_tickets WHERE ticket_nr LIKE 'TK-' || jahr || '-%';
  NEW.ticket_nr := 'TK-' || jahr || '-' || LPAD(seq::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ticket_nr ON support_tickets;
CREATE TRIGGER trg_ticket_nr
  BEFORE INSERT ON support_tickets
  FOR EACH ROW WHEN (NEW.ticket_nr IS NULL)
  EXECUTE FUNCTION generate_ticket_nr();

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_support_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_tickets_updated ON support_tickets;
CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_support_updated_at();

-- 2. KOMMENTAR-THREAD
CREATE TABLE IF NOT EXISTS support_ticket_kommentare (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  autor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  inhalt       TEXT NOT NULL,
  is_internal  BOOLEAN DEFAULT false,
  mentions     UUID[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 3. ANHAENGE
CREATE TABLE IF NOT EXISTS support_ticket_anhaenge (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  kommentar_id  UUID REFERENCES support_ticket_kommentare(id) ON DELETE SET NULL,
  dateiname     TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  dateityp      TEXT,
  dateigroesse  INT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 4. AUDIT-LOG
CREATE TABLE IF NOT EXISTS support_ticket_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  aktion     TEXT NOT NULL,
  alt_wert   TEXT,
  neu_wert   TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. KATEGORIE-ROLLEN-KONFIGURATION
CREATE TABLE IF NOT EXISTS support_kategorie_rollen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategorie       TEXT NOT NULL,
  rolle           TEXT NOT NULL,
  darf_lesen      BOOLEAN DEFAULT true,
  darf_erstellen  BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(kategorie, rolle)
);

INSERT INTO support_kategorie_rollen (kategorie, rolle, darf_lesen, darf_erstellen) VALUES
('IT','inhaber',true,true), ('IT','verkauf',false,false), ('IT','werkstatt',false,false), ('IT','buchhaltung',false,false),
('Abrechnung','inhaber',true,true), ('Abrechnung','buchhaltung',true,true), ('Abrechnung','verkauf',false,false), ('Abrechnung','werkstatt',false,false),
('Marketing','inhaber',true,true), ('Marketing','verkauf',true,true), ('Marketing','werkstatt',false,false), ('Marketing','buchhaltung',false,false),
('Allgemein','inhaber',true,true), ('Allgemein','verkauf',true,true), ('Allgemein','werkstatt',true,true), ('Allgemein','buchhaltung',true,true),
('Sonstiges','inhaber',true,true), ('Sonstiges','verkauf',true,true), ('Sonstiges','werkstatt',true,true), ('Sonstiges','buchhaltung',true,true)
ON CONFLICT (kategorie, rolle) DO NOTHING;

-- 6. CANNED RESPONSES
CREATE TABLE IF NOT EXISTS support_canned_responses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel      TEXT NOT NULL,
  inhalt     TEXT NOT NULL,
  kategorie  TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO support_canned_responses (titel, inhalt, kategorie) VALUES
('BWA-Upload Anleitung', 'Hallo! Bitte lade deine BWA unter Controlling -> BWA Upload hoch. Unterstuetzte Formate: Excel (.xlsx), PDF. Bei Problemen melde dich gerne.', 'Allgemein'),
('Login-Problem', 'Bitte loesche die Browser-Cookies fuer cockpit.vitbikes.de und versuche es erneut. Falls das Problem besteht, setze dein Passwort unter "Passwort vergessen" zurueck.', 'IT'),
('Rechnung anfordern', 'Deine Rechnung findest du unter Abrechnung -> Rechnungen. Falls sie fehlt, pruefen wir das sofort und melden uns innerhalb von 24h.', 'Abrechnung')
ON CONFLICT DO NOTHING;

-- 7. KI-FEEDBACK
CREATE TABLE IF NOT EXISTS support_ki_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  kommentar_id    UUID REFERENCES support_ticket_kommentare(id) ON DELETE SET NULL,
  ki_vorschlag    TEXT NOT NULL,
  finale_antwort  TEXT,
  akzeptiert      BOOLEAN,
  kategorie       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 8. WISSENSARTIKEL
CREATE TABLE IF NOT EXISTS support_wissensartikel (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel           TEXT NOT NULL,
  inhalt          TEXT NOT NULL,
  kategorie       TEXT,
  status          TEXT DEFAULT 'entwurf' CHECK (status IN ('entwurf','review','publiziert','archiviert')),
  ki_generiert    BOOLEAN DEFAULT true,
  basiert_auf     UUID[] DEFAULT '{}',
  erstellt_von    UUID REFERENCES users(id) ON DELETE SET NULL,
  freigegeben_von UUID REFERENCES users(id) ON DELETE SET NULL,
  views           INT DEFAULT 0,
  hilfreich       INT DEFAULT 0,
  nicht_hilfreich INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 9. KI-TRIAGE-LOG
CREATE TABLE IF NOT EXISTS support_ki_triage_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id           UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  vorgeschlagene_kat  TEXT,
  vorgeschlagene_prio TEXT,
  konfidenz           FLOAT,
  akzeptiert          BOOLEAN,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_kommentare ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_anhaenge ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_kategorie_rollen ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ki_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_wissensartikel ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ki_triage_log ENABLE ROW LEVEL SECURITY;

-- support_tickets
CREATE POLICY "partner_liest_eigene_tickets" ON support_tickets
  FOR SELECT USING (
    (SELECT is_hq FROM users WHERE id = auth.uid()) = true
    OR (
      standort_id = (SELECT standort_id FROM users WHERE id = auth.uid())
      AND richtung != 'hq_intern'
    )
  );

CREATE POLICY "partner_erstellt_tickets" ON support_tickets
  FOR INSERT WITH CHECK (
    (SELECT is_hq FROM users WHERE id = auth.uid()) = true
    OR standort_id = (SELECT standort_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "hq_oder_assignee_updated" ON support_tickets
  FOR UPDATE USING (
    (SELECT is_hq FROM users WHERE id = auth.uid()) = true
    OR assignee_id = auth.uid()
    OR erstellt_von = auth.uid()
  );

-- Kommentare
CREATE POLICY "kommentare_lesen" ON support_ticket_kommentare
  FOR SELECT USING (
    (SELECT is_hq FROM users WHERE id = auth.uid()) = true
    OR (
      is_internal = false
      AND ticket_id IN (
        SELECT id FROM support_tickets
        WHERE standort_id = (SELECT standort_id FROM users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "kommentare_erstellen" ON support_ticket_kommentare
  FOR INSERT WITH CHECK (
    (SELECT is_hq FROM users WHERE id = auth.uid()) = true
    OR ticket_id IN (
      SELECT id FROM support_tickets
      WHERE standort_id = (SELECT standort_id FROM users WHERE id = auth.uid())
    )
  );

-- Anhaenge
CREATE POLICY "hq_full_anhaenge" ON support_ticket_anhaenge FOR ALL USING ((SELECT is_hq FROM users WHERE id = auth.uid()) = true);
CREATE POLICY "partner_liest_anhaenge" ON support_ticket_anhaenge FOR SELECT USING (ticket_id IN (SELECT id FROM support_tickets WHERE standort_id = (SELECT standort_id FROM users WHERE id = auth.uid())));
CREATE POLICY "partner_erstellt_anhaenge" ON support_ticket_anhaenge FOR INSERT WITH CHECK (ticket_id IN (SELECT id FROM support_tickets WHERE standort_id = (SELECT standort_id FROM users WHERE id = auth.uid())));

-- Log
CREATE POLICY "hq_full_log" ON support_ticket_log FOR ALL USING ((SELECT is_hq FROM users WHERE id = auth.uid()) = true);
CREATE POLICY "partner_liest_log" ON support_ticket_log FOR SELECT USING (ticket_id IN (SELECT id FROM support_tickets WHERE standort_id = (SELECT standort_id FROM users WHERE id = auth.uid())));

-- Kategorie-Rollen
CREATE POLICY "hq_full_kategorie_rollen" ON support_kategorie_rollen FOR ALL USING ((SELECT is_hq FROM users WHERE id = auth.uid()) = true);
CREATE POLICY "alle_lesen_kategorie_rollen" ON support_kategorie_rollen FOR SELECT USING (true);

-- Canned Responses
CREATE POLICY "alle_lesen_canned" ON support_canned_responses FOR SELECT USING (true);
CREATE POLICY "hq_full_canned" ON support_canned_responses FOR ALL USING ((SELECT is_hq FROM users WHERE id = auth.uid()) = true);

-- KI Feedback
CREATE POLICY "hq_full_ki_feedback" ON support_ki_feedback FOR ALL USING ((SELECT is_hq FROM users WHERE id = auth.uid()) = true);

-- Wissensartikel
CREATE POLICY "alle_lesen_publizierte_artikel" ON support_wissensartikel FOR SELECT USING (status = 'publiziert' OR (SELECT is_hq FROM users WHERE id = auth.uid()) = true);
CREATE POLICY "hq_full_artikel" ON support_wissensartikel FOR ALL USING ((SELECT is_hq FROM users WHERE id = auth.uid()) = true);

-- Triage
CREATE POLICY "hq_full_triage" ON support_ki_triage_log FOR ALL USING ((SELECT is_hq FROM users WHERE id = auth.uid()) = true);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_support_tickets_standort ON support_tickets(standort_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee ON support_tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_erstellt_von ON support_tickets(erstellt_von);
CREATE INDEX IF NOT EXISTS idx_support_kommentare_ticket ON support_ticket_kommentare(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_log_ticket ON support_ticket_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_anhaenge_ticket ON support_ticket_anhaenge(ticket_id);
