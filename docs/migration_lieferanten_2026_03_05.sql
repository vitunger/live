-- ============================================================
-- Migration: lieferanten Tabelle
-- Ersetzt hardcodierte JS-Arrays in einkauf.js
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lieferanten (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lieferant text NOT NULL,
  art text NOT NULL CHECK (art IN ('bike', 'parts', 'Dienstleister')),
  kernsortiment boolean DEFAULT false,
  zusatz boolean DEFAULT false,
  status_konditionen text,
  konditionen_detail text,
  status_iht text,
  zr_iht boolean DEFAULT false,
  stammdaten_zentral boolean DEFAULT false,
  email_innendienst text,
  telefon_innendienst text,
  b2b_shop text,
  email_registrierung text,
  notizen text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.lieferanten ENABLE ROW LEVEL SECURITY;

-- HQ kann alles lesen und schreiben
CREATE POLICY "HQ full access lieferanten"
  ON public.lieferanten
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
  );

-- Partner können nur aktive Kernsortiment/Zusatz-Lieferanten mit fixierten Konditionen lesen
CREATE POLICY "Partner read active lieferanten"
  ON public.lieferanten
  FOR SELECT
  TO authenticated
  USING (
    (kernsortiment = true OR zusatz = true)
    AND status_konditionen = 'Zentrale Konditionen sind vertraglich fixiert'
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_lieferanten_art ON public.lieferanten(art);
CREATE INDEX IF NOT EXISTS idx_lieferanten_kernsortiment ON public.lieferanten(kernsortiment);
CREATE INDEX IF NOT EXISTS idx_lieferanten_status ON public.lieferanten(status_konditionen);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_lieferanten_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lieferanten_updated_at
  BEFORE UPDATE ON public.lieferanten
  FOR EACH ROW EXECUTE FUNCTION update_lieferanten_updated_at();

-- ============================================================
-- Daten-Insert: alle 65 Lieferanten aus Excel
-- ============================================================
INSERT INTO public.lieferanten (lieferant, art, kernsortiment, zusatz, status_konditionen, konditionen_detail, status_iht, zr_iht, stammdaten_zentral, email_innendienst, telefon_innendienst, b2b_shop, email_registrierung) VALUES
('AMFLOW/ DJI', 'bike', false, false, 'Verhandlung gescheitert', 'Konditionen zu gering', 'IHT aktuell nicht geplant', false, false, null, null, null, null),
('Babboe', 'bike', false, true, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Accell', 'wird über IHT reguliert', true, true, 'service@winora-group.de', '+49 (0)9721-6501-7878', 'Accentry b2b', 'callcenter@winora.de'),
('CaGo', 'bike', false, true, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Ca Go', 'wird über IHT reguliert', true, false, 'nouri.hamsoro@rtisports.de', '+49 (0)261 899998-220', 'Ca Go b2b', 'nouri.hamsoro@rtisports.de'),
('Centurion', 'bike', false, false, 'Verhandlung gescheitert', null, 'IHT abgelehnt', false, true, null, null, null, null),
('Conway', 'bike', false, false, 'Kontakt aufgenommen', null, 'in Verhandlung', false, true, null, null, null, null),
('Gazelle', 'bike', false, false, 'Volumen nicht ausreichend für zentrale Verhandlung', null, 'IHT aktuell nicht geplant', false, true, null, null, null, null),
('Ghost, Lapierre', 'bike', false, true, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Accell', 'wird über IHT reguliert', true, true, 'sales@ghost-bikes.de', '+49 9632 9255-0', 'Accentry b2b', 'service@ghost-bikes.de'),
('HASE bike', 'bike', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen HASE', 'im Onboarding', false, true, 'Hendrik.Forejta@hasebikes.com', '+49 2309 9377-236', null, 'Hendrik.Forejta@hasebikes.com'),
('HEPHA', 'bike', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Hepha', 'wird über IHT reguliert', true, true, 'info@hepha.com', '+49(0) 8142 / 2844480', null, 'bernd.lesch@hepha.com'),
('i:SY', 'bike', false, false, 'Volumen nicht ausreichend für zentrale Verhandlung', null, 'IHT aktuell nicht geplant', false, true, 'yasemin@isy.de', '+49 221 5727744445', null, 'yasemin@isy.de'),
('Kalkhoff', 'bike', false, false, 'Volumen nicht ausreichend für zentrale Verhandlung', null, 'IHT abgelehnt', false, true, null, null, null, null),
('Koga', 'bike', false, true, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Accell', 'wird über IHT reguliert', true, false, 'service@winora-group.de', '+49 (0)9721-6501-7878', 'Accentry b2b', 'callcenter@winora.de'),
('KTM', 'bike', false, false, 'Volumen nicht ausreichend für zentrale Verhandlung', null, 'IHT aktuell nicht geplant', false, false, null, null, null, null),
('M1', 'bike', false, false, 'Lieferant läuft aus', 'Insolvenz M1!', 'IHT abgelehnt', false, false, 'info@m1-sporttechnik.de', '08020-90891170', null, 'j.sauer@m1-sporttechnik.de'),
('Nicolai', 'bike', false, false, 'In Verhandlung', null, 'in Verhandlung', false, false, null, null, null, null),
('Orbea', 'bike', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Orbea', 'in Verhandlung', false, true, 'cponzlet@orbea.com', '+49 231 98819869', 'Orbea KIDE', 'cponzlet@orbea.com'),
('Raymon', 'bike', false, false, 'Kontakt aufgenommen', null, 'IHT aktuell nicht geplant', false, true, null, null, null, null),
('Riese und Müller', 'bike', true, false, 'In Verhandlung', null, 'in Verhandlung', false, true, 'vertrieb@r-m.de', '+49 6151 36686-11', 'R&M b2b', 'vertrieb@r-m.de'),
('Simplon', 'bike', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Simplon', 'im Onboarding', false, false, 'sales@simplon.com', '+43 5574 72564401', 'Simplon b2b', 'sales@simplon.com'),
('Specialized', 'bike', false, false, 'Volumen nicht ausreichend für zentrale Verhandlung', null, 'IHT aktuell nicht geplant', false, true, null, null, null, null),
('Steppenwolf', 'bike', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Steppenwolf', 'wird über IHT reguliert', true, false, 'sales@steppenwolf-bikes.com', '+49 30 863280217', 'Steppenwolf b2b', 'sales@steppenwolf-bikes.com'),
('Urban Arrow', 'bike', false, false, 'Verhandlung gescheitert', 'Konditionen zu gering', 'IHT abgelehnt', false, false, null, null, null, null),
('Velo de Ville', 'bike', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Velo de Ville', 'wird über IHT reguliert', true, true, 'philipp.niehues@velo-de-ville.com', '+49 2505 9305 965', 'VdV b2b', 'marketing@velo-de-ville.com'),
('Winora, Haibike', 'bike', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Accell', 'wird über IHT reguliert', true, true, 'service@winora-group.de', '+49(0) 9721-6501-7878', 'Accentry b2b', 'callcenter@winora.de'),
('Bike Leasing Service', 'Dienstleister', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen BLS', 'IHT aktuell nicht geplant', false, false, null, null, 'BLS b2b', null),
('BikeCenter', 'Dienstleister', false, true, 'In Verhandlung', null, 'IHT aktuell nicht geplant', false, false, null, null, null, null),
('Businessbike', 'Dienstleister', true, false, 'Vertrag in Finalisierung', null, 'IHT aktuell nicht geplant', false, false, null, null, 'Businessbike b2b', null),
('Company Bike', 'Dienstleister', false, true, 'In Verhandlung', null, 'IHT aktuell nicht geplant', false, false, null, null, 'CB b2b', null),
('Deutsche Dienstrad', 'Dienstleister', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen DD', 'IHT aktuell nicht geplant', false, false, null, null, 'DD b2b', null),
('Eleasa', 'Dienstleister', false, true, 'Kontaktaufnahme ausstehend', null, 'IHT aktuell nicht geplant', false, false, null, null, 'Eleasa b2b', null),
('GO', 'Dienstleister', true, false, 'Kontaktaufnahme ausstehend', null, 'IHT aktuell nicht geplant', false, false, null, null, null, null),
('Jobrad', 'Dienstleister', true, false, 'Kontaktaufnahme ausstehend', null, 'IHT aktuell nicht geplant', false, false, null, null, 'Jobrad b2b', null),
('Kazenmaier', 'Dienstleister', false, true, 'Kontaktaufnahme ausstehend', null, 'IHT aktuell nicht geplant', false, false, null, null, 'Kazenmaier b2b', null),
('lease a bike', 'Dienstleister', false, true, 'Kontaktaufnahme ausstehend', null, 'IHT aktuell nicht geplant', false, false, null, null, 'leasabike b2b', null),
('Linexo', 'Dienstleister', false, true, 'Kontaktaufnahme ausstehend', null, 'IHT aktuell nicht geplant', false, false, null, null, 'linexo b2b', null),
('Mein Dienstrad', 'Dienstleister', false, true, 'Kontakt aufgenommen', null, 'IHT aktuell nicht geplant', false, false, null, null, 'MDR b2b', null),
('Probonio', 'Dienstleister', true, false, 'Kontakt aufgenommen', null, 'in Verhandlung', false, false, null, null, null, null),
('Smartfit', 'Dienstleister', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Smartfit', 'im Onboarding', false, false, 'rw@smartfit.bike', '+49 160 6666367', null, 'rw@smartfit.bike'),
('Strom', 'Dienstleister', false, false, 'Kontaktaufnahme ausstehend', null, 'Kontaktaufnahme ausstehend', false, false, null, null, null, null),
('Telecash', 'Dienstleister', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Telecash', 'IHT aktuell nicht geplant', false, false, 'christian.koenig@fiserv.com', '+49 (0) 911 945 8387', null, 'christian.koenig@fiserv.com'),
('Telekom', 'Dienstleister', false, false, 'Kontaktaufnahme ausstehend', null, 'Kontaktaufnahme ausstehend', false, false, null, null, null, null),
('Wertgarantie by linexo', 'Dienstleister', true, false, 'Kontaktaufnahme ausstehend', null, 'IHT aktuell nicht geplant', false, false, null, null, 'Wertgarantie b2b', null),
('Würth Leasing', 'Dienstleister', false, true, 'Kontaktaufnahme ausstehend', null, 'IHT aktuell nicht geplant', false, false, null, null, 'Würth Leasing b2b', null),
('ABUS', 'parts', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen ABUS', 'IHT abgelehnt', false, true, 'mobile.vertrieb@abus.de', '+49 2335 634 470', 'ABUS b2b', 'mobile.vertrieb@abus.de'),
('Alps Alpine', 'parts', false, false, 'Kontakt aufgenommen', null, 'in Verhandlung', false, false, null, null, null, null),
('ASISTA', 'parts', false, false, 'Verhandlung gescheitert', 'Konditionen zu gering', 'Kontaktaufnahme ausstehend', false, false, null, null, null, null),
('Cosmic Sports', 'parts', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Cosmic Sports', 'wird über IHT reguliert', true, true, 'tm@cosmicsports.de', '+49 911 310 755 59', 'Cosmic Sports b2b', 'tm@cosmicsports.de'),
('Croozer', 'parts', false, false, 'Kontakt aufgenommen', null, 'IHT aktuell nicht geplant', false, true, 'order@croozer.com', '02233-959913', null, 'support@croozer.com'),
('Fidlock', 'parts', true, false, 'Vertrag in Finalisierung', null, 'im Onboarding', false, false, null, null, null, null),
('Grofa', 'parts', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Grofa', 'wird über IHT reguliert', true, true, 'order@grofa.com', '06434/2008-200', 'GROFA b2b', 'stammdaten@grofa.com'),
('Hartje', 'parts', false, true, 'In Verhandlung', null, 'in Verhandlung', false, true, null, null, 'Hartje EOSweb', null),
('Livall/ CycloSport', 'parts', false, true, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen CycloSport', 'wird über IHT reguliert', true, false, 'bestellung@ciclosport.de', '089-895270-20', null, 'bestellung@ciclosport.de'),
('Magura/ Bosch', 'parts', true, false, 'Kontakt aufgenommen', null, 'in Verhandlung', false, true, null, null, 'MBPS b2b', null),
('MCG', 'parts', false, false, 'Verhandlung gescheitert', null, 'IHT abgelehnt', false, true, 'vertrieb@merida-centurion.com', '+49 (0)7159/9459-300', 'MCG b2b', 'vertrieb@merida-centurion.com'),
('OneUp Components', 'parts', false, true, 'Kontakt aufgenommen', null, 'in Verhandlung', false, false, null, null, 'ONEup b2b', null),
('Ortlieb', 'parts', false, true, 'Kontaktaufnahme ausstehend', null, 'Kontaktaufnahme ausstehend', false, false, null, null, null, null),
('Paul Lange', 'parts', true, false, 'Vertrag in Finalisierung', null, 'im Onboarding', false, true, 'verkauf@paul-lange.de', '+49 (0) 711 2588 333', 'Paul Lange b2b', 'verkauf@paul-lange.de'),
('Pow Unity', 'parts', true, false, 'Kontaktaufnahme ausstehend', null, 'Kontaktaufnahme ausstehend', false, false, null, null, 'Powunity b2b', null),
('RTI Sports', 'parts', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Topeak', 'wird über IHT reguliert', true, true, 'nouri.hamsoro@rtisports.de', '+49 (0)261 899998-220', 'RTI Sports b2b', 'nouri.hamsoro@rtisports.de'),
('SportsNut', 'parts', false, false, 'Kontakt aufgenommen', null, 'Kontaktaufnahme ausstehend', false, false, null, null, 'SportsNut b2b', null),
('SQlab', 'parts', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen SQlab', 'wird über IHT reguliert', true, true, 'feb@sq-lab.com', '089-6661046-0', 'SQlab b2b', 'aba@sq-lab.com'),
('Thule', 'parts', false, true, 'Kontakt aufgenommen', null, 'IHT aktuell nicht geplant', false, true, null, null, null, null),
('Tunap', 'parts', true, false, 'Vertrag in Finalisierung', 'Konditionen TUNAP', 'im Onboarding', false, false, 'Carolin.Schorsten@tunap-sports.de', '0151 15059430', 'TUNAP eShop', 'Carolin.Schorsten@tunap-sports.de'),
('Vaude', 'parts', false, true, 'Kontaktaufnahme ausstehend', null, 'Kontaktaufnahme ausstehend', false, true, null, null, 'VAUDE b2b', null),
('Wiener Bike Parts', 'parts', true, false, 'Zentrale Konditionen sind vertraglich fixiert', 'Konditionen Wiener Bike Parts', 'wird über IHT reguliert', true, true, 'callcenter@bike-parts.de', '09721 65 01-0', 'Accentry b2b', 'customer-data@winora-group.de');

