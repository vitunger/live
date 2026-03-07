-- ============================================================
-- Spiritus v3.0 – Ergaenzende Migration
-- Datum: 2026-03-07
-- ============================================================

-- Telefonnummer fuer 3CX Caller-ID → Standort Matching
ALTER TABLE standorte ADD COLUMN IF NOT EXISTS telefon_3cx text;
