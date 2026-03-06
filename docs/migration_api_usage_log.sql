-- Migration: api_usage_log Tabelle fuer KI-API-Kosten-Tracking
-- Erstellt: 2026-03-06
-- Zweck: Jeden API-Call (Anthropic Claude, OpenAI, etc.) protokollieren
--         fuer das Nutzungs-Dashboard im HQ-Cockpit

CREATE TABLE IF NOT EXISTS api_usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Was wurde aufgerufen
    edge_function TEXT NOT NULL,           -- z.B. 'dev-ki-analyse', 'spiritus-analyze'
    modul TEXT,                            -- z.B. 'release_notes', 'prioritize', 'spiritus'
    
    -- Provider & Modell
    provider TEXT NOT NULL DEFAULT 'anthropic',  -- 'anthropic' | 'openai' | ...
    model TEXT,                            -- z.B. 'claude-sonnet-4-20250514', 'gpt-4o'
    
    -- Token-Verbrauch
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    
    -- Kosten (berechnet beim Insert)
    estimated_cost_usd NUMERIC(10,6) DEFAULT 0,
    
    -- Performance
    duration_ms INTEGER DEFAULT 0,
    
    -- Kontext
    user_id UUID REFERENCES auth.users(id),
    standort_id UUID REFERENCES standorte(id),
    standort_name TEXT,
    
    -- Erfolg
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Indices fuer schnelle Abfragen im Dashboard
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_function ON api_usage_log(edge_function);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage_log(provider);
CREATE INDEX IF NOT EXISTS idx_api_usage_standort ON api_usage_log(standort_id);

-- RLS: Nur HQ-User koennen api_usage_log lesen
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

-- Service Role (Edge Functions) kann immer inserten
CREATE POLICY "service_role_insert_api_usage"
    ON api_usage_log FOR INSERT
    TO service_role
    WITH CHECK (true);

-- HQ-User koennen lesen
CREATE POLICY "hq_read_api_usage"
    ON api_usage_log FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_hq = true
        )
    );

-- Kommentar
COMMENT ON TABLE api_usage_log IS 'Protokolliert jeden externen KI-API-Call (Anthropic, OpenAI etc.) fuer Kosten-Monitoring im HQ-Dashboard';
