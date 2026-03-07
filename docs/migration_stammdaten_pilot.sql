-- Migration: Stammdaten fuer 5 Pilot-Standorte
-- Ausfuehren im Supabase SQL Editor
-- WICHTIG: Standort-IDs (UUIDs) muessen zuerst aus der DB abgefragt werden!
--
-- Abfrage: SELECT id, name FROM standorte WHERE name ILIKE ANY(ARRAY['%Grafrath%','%Muenchen%City%','%Augsburg%','%Starnberg%','%Witten%']) ORDER BY name;
--
-- Dann die UUIDs unten einsetzen.

-- ══════════════════════════════════════════════════════
-- 1. Grafrath
-- ══════════════════════════════════════════════════════
UPDATE standorte SET
  inhaber_name   = '-- EINSETZEN --',
  region         = 'Oberbayern',
  umsatz_plan_ytd = 0,          -- Jahresumsatzplan in EUR einsetzen
  marketing_budget = 0,          -- Jahres-Marketingbudget in EUR einsetzen
  adresse        = '-- EINSETZEN --',
  telefon        = '-- EINSETZEN --',
  warenwirtschaft = 'app-room',  -- oder 'velodata', 'velo_plus', 'business_central'
  status         = 'aktiv'
WHERE name ILIKE '%Grafrath%';

-- ══════════════════════════════════════════════════════
-- 2. Muenchen City
-- ══════════════════════════════════════════════════════
UPDATE standorte SET
  inhaber_name   = '-- EINSETZEN --',
  region         = 'Muenchen',
  umsatz_plan_ytd = 0,
  marketing_budget = 0,
  adresse        = '-- EINSETZEN --',
  telefon        = '-- EINSETZEN --',
  warenwirtschaft = 'app-room',
  status         = 'aktiv'
WHERE name ILIKE '%M_nchen%City%' OR name ILIKE '%Muenchen%City%';

-- ══════════════════════════════════════════════════════
-- 3. Augsburg
-- ══════════════════════════════════════════════════════
UPDATE standorte SET
  inhaber_name   = '-- EINSETZEN --',
  region         = 'Schwaben',
  umsatz_plan_ytd = 0,
  marketing_budget = 0,
  adresse        = '-- EINSETZEN --',
  telefon        = '-- EINSETZEN --',
  warenwirtschaft = 'app-room',
  status         = 'aktiv'
WHERE name ILIKE '%Augsburg%';

-- ══════════════════════════════════════════════════════
-- 4. Starnberg
-- ══════════════════════════════════════════════════════
UPDATE standorte SET
  inhaber_name   = '-- EINSETZEN --',
  region         = 'Oberbayern',
  umsatz_plan_ytd = 0,
  marketing_budget = 0,
  adresse        = '-- EINSETZEN --',
  telefon        = '-- EINSETZEN --',
  warenwirtschaft = 'app-room',
  status         = 'aktiv'
WHERE name ILIKE '%Starnberg%';

-- ══════════════════════════════════════════════════════
-- 5. Witten
-- ══════════════════════════════════════════════════════
UPDATE standorte SET
  inhaber_name   = '-- EINSETZEN --',
  region         = 'Ruhrgebiet',
  umsatz_plan_ytd = 0,
  marketing_budget = 0,
  adresse        = '-- EINSETZEN --',
  telefon        = '-- EINSETZEN --',
  warenwirtschaft = 'app-room',
  status         = 'aktiv'
WHERE name ILIKE '%Witten%';

-- ══════════════════════════════════════════════════════
-- Verifizierung
-- ══════════════════════════════════════════════════════
SELECT name, inhaber_name, region, umsatz_plan_ytd, marketing_budget, warenwirtschaft, status
FROM standorte
WHERE inhaber_name IS NOT NULL AND inhaber_name != '-- EINSETZEN --'
ORDER BY name;
