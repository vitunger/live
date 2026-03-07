-- Migration: Standort-Stammdaten erweitern
-- Datum: 07.03.2026
-- Status: BEREITS AUSGEFUEHRT (via Supabase Management API)

-- Neue Spalten in standorte-Tabelle
ALTER TABLE standorte ADD COLUMN IF NOT EXISTS email text DEFAULT NULL;
ALTER TABLE standorte ADD COLUMN IF NOT EXISTS stadt text DEFAULT NULL;
ALTER TABLE standorte ADD COLUMN IF NOT EXISTS oeffnungszeiten jsonb DEFAULT NULL;

-- Kommentare
COMMENT ON COLUMN standorte.email IS 'E-Mail-Adresse des Standorts';
COMMENT ON COLUMN standorte.stadt IS 'Stadt des Standorts';
COMMENT ON COLUMN standorte.oeffnungszeiten IS 'Öffnungszeiten als JSONB: {mo: {von, bis}, di: ..., so: null}';

-- Beispiel-Daten fuer Oeffnungszeiten:
-- UPDATE standorte SET oeffnungszeiten = '{
--   "mo": {"von": "09:00", "bis": "18:00"},
--   "di": {"von": "09:00", "bis": "18:00"},
--   "mi": {"von": "09:00", "bis": "18:00"},
--   "do": {"von": "09:00", "bis": "18:00"},
--   "fr": {"von": "09:00", "bis": "18:00"},
--   "sa": {"von": "09:00", "bis": "14:00"},
--   "so": null
-- }'::jsonb
-- WHERE id = '...';
