-- Marketing Module Migration
-- Datum: 2026-03-05
-- Tabellen: marketing_vereinbarungen, marketing_lead_tracking
-- Storage: marketing-docs Bucket

-- ═══════════════════════════════════════
-- 1. marketing_vereinbarungen
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS marketing_vereinbarungen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  standort_id UUID REFERENCES standorte(id) NOT NULL,
  jahr INTEGER NOT NULL DEFAULT 2026,
  inhaber_name TEXT,
  ansprechpartner TEXT DEFAULT 'Michael Stenzel',
  budget_jahr NUMERIC NOT NULL,
  flex_budget NUMERIC DEFAULT 0,
  umsatz_ziel NUMERIC,
  avg_verkauf NUMERIC,
  verkaufsquote NUMERIC,
  marketing_anteil NUMERIC,
  cpt NUMERIC,
  max_leads INTEGER,
  lead_anteil NUMERIC,
  mediamix TEXT[] DEFAULT '{"Meta","Google"}',
  crm_testphase BOOLEAN DEFAULT false,
  saison_gewichtung NUMERIC[] DEFAULT '{4,8,10,11,12,11,11,10,9,6,5,3}',
  signed BOOLEAN DEFAULT false,
  sign_date DATE,
  pdf_storage_path TEXT,
  perf_vorjahr JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(standort_id, jahr)
);

ALTER TABLE marketing_vereinbarungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mktv_partner_select" ON marketing_vereinbarungen FOR SELECT USING (
  standort_id = (SELECT standort_id FROM public.users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
);

CREATE POLICY "mktv_hq_all" ON marketing_vereinbarungen FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
);

-- ═══════════════════════════════════════
-- 2. marketing_lead_tracking
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS marketing_lead_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  standort_id UUID REFERENCES standorte(id) NOT NULL,
  jahr INTEGER NOT NULL,
  monat INTEGER NOT NULL CHECK (monat BETWEEN 1 AND 12),
  budget_soll NUMERIC,
  leads_soll INTEGER,
  budget_ist NUMERIC DEFAULT 0,
  leads_ist INTEGER DEFAULT 0,
  termine_ist INTEGER DEFAULT 0,
  store_visits_ist INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(standort_id, jahr, monat)
);

ALTER TABLE marketing_lead_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mktl_partner_select" ON marketing_lead_tracking FOR SELECT USING (
  standort_id = (SELECT standort_id FROM public.users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
);

CREATE POLICY "mktl_hq_all" ON marketing_lead_tracking FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
);

-- ═══════════════════════════════════════
-- 3. Storage Bucket
-- ═══════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-docs', 'marketing-docs', false)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════
-- 4. Seed-Daten: Berlin-Brandenburg
-- ═══════════════════════════════════════
INSERT INTO marketing_vereinbarungen (standort_id, jahr, inhaber_name, ansprechpartner, budget_jahr, umsatz_ziel, avg_verkauf, verkaufsquote, marketing_anteil, cpt, max_leads, lead_anteil, mediamix, crm_testphase, saison_gewichtung, signed, sign_date, perf_vorjahr)
VALUES (
  (SELECT id FROM standorte WHERE name ILIKE '%Berlin%' LIMIT 1),
  2026, 'Patrick Henkel', 'Michael Stenzel', 44000, 1800000, 4800, 85, 2.44, 200, 220, 50,
  '{"Meta","Google","Framen","Audio","Events"}', true,
  '{4,8,10,11,12,11,11,10,9,6,5,3}', true, '2025-10-17',
  '{"kosten":31508.25,"termine":113,"store_visits":455,"impressionen":3248824,"klicks":32266,"budget_monat_avg":3815.68,"cpc_avg":140.10,"cpt_avg":303.20,"terminziel_pct":57,"sv_ziel_pct":125}'
)
ON CONFLICT (standort_id, jahr) DO NOTHING;

-- ═══════════════════════════════════════
-- 5. Seed-Daten: Witten
-- ═══════════════════════════════════════
INSERT INTO marketing_vereinbarungen (standort_id, jahr, inhaber_name, ansprechpartner, budget_jahr, flex_budget, umsatz_ziel, avg_verkauf, verkaufsquote, marketing_anteil, cpt, max_leads, lead_anteil, mediamix, crm_testphase, saison_gewichtung, signed, sign_date, perf_vorjahr)
VALUES (
  (SELECT id FROM standorte WHERE name ILIKE '%Witten%' LIMIT 1),
  2026, 'Thorsten Guhr', 'Michael Stenzel', 36000, 4000, 1400000, 4200, 75, 2.6, 125, 288, 65,
  '{"Meta","Google","Framen","Audio","Events"}', false,
  '{4,8,10,11,12,11,11,10,9,6,5,3}', true, '2025-11-25',
  '{"kosten":19104.27,"termine":201,"store_visits":156,"impressionen":2431454,"klicks":34470,"budget_monat_avg":2120.47,"cpc_avg":60.78,"cpt_avg":96.63,"terminziel_pct":114,"sv_ziel_pct":180}'
)
ON CONFLICT (standort_id, jahr) DO NOTHING;
