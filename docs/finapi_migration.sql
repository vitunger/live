-- ============================================================
-- finAPI Banking Integration – DB Migration
-- Ausführen im Supabase SQL Editor (einmalig)
-- ============================================================

-- 1. finAPI User-Mapping (standort → finAPI Nutzer)
CREATE TABLE IF NOT EXISTS finapi_users (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  standort_id       uuid REFERENCES standorte(id) ON DELETE CASCADE,
  finapi_user_id    text NOT NULL,
  finapi_password   text NOT NULL,  -- gespeichert verschlüsselt in Supabase
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(standort_id)
);

-- 2. Bankkonten pro Standort
CREATE TABLE IF NOT EXISTS bank_accounts (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  standort_id          uuid REFERENCES standorte(id) ON DELETE CASCADE,
  finapi_account_id    text NOT NULL,
  iban                 text,
  account_name         text,
  account_type         text,  -- Girokonto, Tagesgeld, Kreditkarte, etc.
  balance              numeric(14,2) DEFAULT 0,
  overdraft            numeric(14,2) DEFAULT 0,
  bank_name            text,
  last_sync            timestamptz,
  updated_at           timestamptz DEFAULT now(),
  UNIQUE(standort_id, finapi_account_id)
);

-- 3. Spalte last_banking_sync in standorte (für HQ-Übersicht)
ALTER TABLE standorte
  ADD COLUMN IF NOT EXISTS last_banking_sync timestamptz;

-- 4. RLS aktivieren
ALTER TABLE finapi_users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- finapi_users: nur HQ darf sehen (enthält Credentials)
CREATE POLICY "HQ sieht alle finapi_users"
  ON finapi_users FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
  );

-- bank_accounts: Partner sieht eigene, HQ sieht alle
CREATE POLICY "Partner sieht eigene Bankkonten"
  ON bank_accounts FOR SELECT
  USING (
    standort_id = (SELECT standort_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
  );

CREATE POLICY "Service-Role kann bank_accounts schreiben"
  ON bank_accounts FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Indizes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_standort ON bank_accounts(standort_id);
CREATE INDEX IF NOT EXISTS idx_finapi_users_standort  ON finapi_users(standort_id);

-- ============================================================
-- HINWEIS: Secrets in Supabase Dashboard eintragen:
--   FINAPI_CLIENT_ID      → von finAPI Sandbox-Dashboard
--   FINAPI_CLIENT_SECRET  → von finAPI Sandbox-Dashboard
--   FINAPI_BASE_URL       → https://sandbox.finapi.io
-- ============================================================
