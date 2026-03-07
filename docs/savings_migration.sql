-- Migration: cockpit_savings Erweiterung
-- Manuell ausführen im Supabase SQL Editor

ALTER TABLE cockpit_savings 
    ADD COLUMN IF NOT EXISTS nutzer_typ text DEFAULT 'beide' 
        CHECK (nutzer_typ IN ('hq', 'partner', 'beide')),
    ADD COLUMN IF NOT EXISTS abrechnungsrhythmus text DEFAULT 'monatlich' 
        CHECK (abrechnungsrhythmus IN ('monatlich', 'jaehrlich')),
    ADD COLUMN IF NOT EXISTS original_betrag numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS anzahl_nutzer integer DEFAULT 1;

UPDATE cockpit_savings SET nutzer_typ = 'hq', anzahl_nutzer = 1 WHERE name = 'Deskly';
