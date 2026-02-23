-- =============================================================
-- eTermin Integration – DB Schema
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. eTermin Configuration (API keys, stored per HQ)
CREATE TABLE IF NOT EXISTS etermin_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standort_id UUID REFERENCES standorte(id),  -- NULL = HQ-level config
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,  -- TODO: move to Supabase Vault for production
    webhook_url TEXT DEFAULT 'https://cockpit.vitbikes.de/api/webhooks/etermin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Calendar → Standort Mapping
CREATE TABLE IF NOT EXISTS etermin_calendar_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_name TEXT NOT NULL,       -- eTermin calendar name (e.g. "Grafrath")
    calendar_id TEXT,                   -- eTermin calendar ID
    standort_id UUID NOT NULL REFERENCES standorte(id),
    mitarbeiter_id UUID REFERENCES users(id),  -- optional: future 1:1 MA mapping
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add eTermin fields to existing 'termine' table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'termine' AND column_name = 'etermin_uid') THEN
        ALTER TABLE termine ADD COLUMN etermin_uid TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'termine' AND column_name = 'quelle') THEN
        ALTER TABLE termine ADD COLUMN quelle TEXT DEFAULT 'portal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'termine' AND column_name = 'kontakt_name') THEN
        ALTER TABLE termine ADD COLUMN kontakt_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'termine' AND column_name = 'kontakt_email') THEN
        ALTER TABLE termine ADD COLUMN kontakt_email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'termine' AND column_name = 'kontakt_telefon') THEN
        ALTER TABLE termine ADD COLUMN kontakt_telefon TEXT;
    END IF;
END $$;

-- 4. Add eTermin fields to existing 'leads' table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'etermin_uid') THEN
        ALTER TABLE leads ADD COLUMN etermin_uid TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'termin_id') THEN
        ALTER TABLE leads ADD COLUMN termin_id UUID;
    END IF;
END $$;

-- 5. Index for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_termine_etermin_uid ON termine(etermin_uid) WHERE etermin_uid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_etermin_uid ON leads(etermin_uid) WHERE etermin_uid IS NOT NULL;

-- 6. RLS Policies for etermin_config (HQ only)
ALTER TABLE etermin_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "etermin_config_hq_read" ON etermin_config
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
    );
CREATE POLICY IF NOT EXISTS "etermin_config_hq_write" ON etermin_config
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
    );

-- 7. RLS for calendar mapping (HQ can manage, partners can read their own)
ALTER TABLE etermin_calendar_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "etermin_map_hq_all" ON etermin_calendar_map
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
    );
CREATE POLICY IF NOT EXISTS "etermin_map_partner_read" ON etermin_calendar_map
    FOR SELECT USING (
        standort_id IN (SELECT standort_id FROM users WHERE id = auth.uid())
    );

-- 8. Grant service role access (for webhook edge function)
GRANT ALL ON etermin_config TO service_role;
GRANT ALL ON etermin_calendar_map TO service_role;
