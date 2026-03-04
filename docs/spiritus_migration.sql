-- ============================================================
-- SPIRITUS – Call Intelligence DB Migration
-- In Supabase SQL-Editor ausführen
-- ============================================================

-- Calls Tabelle
CREATE TABLE IF NOT EXISTS spiritus_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    standort_id UUID REFERENCES standorte(id) ON DELETE SET NULL,
    call_date DATE NOT NULL DEFAULT CURRENT_DATE,
    call_type TEXT DEFAULT 'beratung' CHECK (call_type IN ('beratung','review','onboarding','support','strategie')),
    contact TEXT,
    transcript_text TEXT,
    summary TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','analyzing','done','error')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extraktionen (Probleme, Maßnahmen, Sentiment)
CREATE TABLE IF NOT EXISTS spiritus_extractions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID REFERENCES spiritus_calls(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('problem','massnahme','sentiment')),
    content TEXT NOT NULL,
    confidence NUMERIC(4,3) DEFAULT 0.7,
    data JSONB DEFAULT '{}',
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KB-Einträge (automatisch genehmigt bei confidence >= 0.85)
CREATE TABLE IF NOT EXISTS spiritus_kb (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_call_id UUID REFERENCES spiritus_calls(id) ON DELETE SET NULL,
    standort_id UUID REFERENCES standorte(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'massnahme',
    auto_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_spiritus_calls_standort ON spiritus_calls(standort_id);
CREATE INDEX IF NOT EXISTS idx_spiritus_calls_date ON spiritus_calls(call_date DESC);
CREATE INDEX IF NOT EXISTS idx_spiritus_extractions_call ON spiritus_extractions(call_id);
CREATE INDEX IF NOT EXISTS idx_spiritus_kb_approved ON spiritus_kb(auto_approved);

-- RLS aktivieren
ALTER TABLE spiritus_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE spiritus_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spiritus_kb ENABLE ROW LEVEL SECURITY;

-- HQ: voller Zugriff
CREATE POLICY "HQ kann alle Calls lesen" ON spiritus_calls
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
    );

CREATE POLICY "HQ kann Calls einfügen" ON spiritus_calls
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
    );

CREATE POLICY "HQ kann Calls updaten" ON spiritus_calls
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
    );

CREATE POLICY "HQ kann Extraktionen lesen" ON spiritus_extractions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
    );

CREATE POLICY "HQ kann KB lesen" ON spiritus_kb
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
    );
