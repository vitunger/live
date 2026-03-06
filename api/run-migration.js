// Einmalige DB-Migration für einkauf_performance Tabellen
// Diese API Route wird nach dem Deploy einmalig aufgerufen

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lwwagbkxeofahhwebkab.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) { return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert' }), { status: 500 }); }

const STATEMENTS = [
`CREATE TABLE IF NOT EXISTS einkauf_performance_abfragen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  zeitraum_aktuell TEXT NOT NULL,
  zeitraum_vorjahr TEXT NOT NULL,
  notiz TEXT,
  status TEXT NOT NULL DEFAULT 'offen',
  erstellt_von UUID REFERENCES auth.users(id),
  erstellt_am TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)`,
`ALTER TABLE einkauf_performance_abfragen ENABLE ROW LEVEL SECURITY`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_abfragen' AND policyname='HQ full access einkauf_performance_abfragen') THEN
    EXECUTE 'CREATE POLICY "HQ full access einkauf_performance_abfragen" ON einkauf_performance_abfragen FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true))';
  END IF;
END $$`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_abfragen' AND policyname='Partner read einkauf_performance_abfragen') THEN
    EXECUTE 'CREATE POLICY "Partner read einkauf_performance_abfragen" ON einkauf_performance_abfragen FOR SELECT USING (status = ''offen'')';
  END IF;
END $$`,
`CREATE TABLE IF NOT EXISTS einkauf_performance_daten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abfrage_id UUID NOT NULL REFERENCES einkauf_performance_abfragen(id) ON DELETE CASCADE,
  standort_id UUID NOT NULL REFERENCES standorte(id) ON DELETE CASCADE,
  marke TEXT NOT NULL,
  absatz_aktuell NUMERIC,
  absatz_vorjahr NUMERIC,
  umsatz_aktuell NUMERIC,
  umsatz_vorjahr NUMERIC,
  lager_stueck NUMERIC,
  lager_wert NUMERIC,
  rabatt_aktuell NUMERIC,
  rabatt_vorjahr NUMERIC,
  rohertrag_aktuell NUMERIC,
  rohertrag_vorjahr NUMERIC,
  abgeschlossen BOOLEAN DEFAULT false,
  erstellt_am TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)`,
`ALTER TABLE einkauf_performance_daten ENABLE ROW LEVEL SECURITY`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_daten' AND policyname='HQ read all einkauf_performance_daten') THEN
    EXECUTE 'CREATE POLICY "HQ read all einkauf_performance_daten" ON einkauf_performance_daten FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true))';
  END IF;
END $$`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_daten' AND policyname='Partner read own einkauf_performance_daten') THEN
    EXECUTE 'CREATE POLICY "Partner read own einkauf_performance_daten" ON einkauf_performance_daten FOR SELECT USING (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()))';
  END IF;
END $$`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_daten' AND policyname='Partner insert own einkauf_performance_daten') THEN
    EXECUTE 'CREATE POLICY "Partner insert own einkauf_performance_daten" ON einkauf_performance_daten FOR INSERT WITH CHECK (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()))';
  END IF;
END $$`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_daten' AND policyname='Partner update own einkauf_performance_daten') THEN
    EXECUTE 'CREATE POLICY "Partner update own einkauf_performance_daten" ON einkauf_performance_daten FOR UPDATE USING (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()))';
  END IF;
END $$`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_daten' AND policyname='Partner delete own einkauf_performance_daten') THEN
    EXECUTE 'CREATE POLICY "Partner delete own einkauf_performance_daten" ON einkauf_performance_daten FOR DELETE USING (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()) AND abgeschlossen = false)';
  END IF;
END $$`,
`CREATE INDEX IF NOT EXISTS idx_ekperf_daten_abfrage ON einkauf_performance_daten(abfrage_id)`,
`CREATE INDEX IF NOT EXISTS idx_ekperf_daten_standort ON einkauf_performance_daten(standort_id)`
];

async function runSql(sql) {
  // Supabase erlaubt keine direkte DDL via REST — aber via eine stored procedure
  // Wir nutzen den PostgREST RPC endpoint mit einer SECURITY DEFINER Funktion
  // Da wir keine haben, versuchen wir den Umweg via supabase-js Admin Client
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/run_ddl`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ddl: sql })
  });
  return { status: response.status, body: await response.text() };
}

module.exports = async (req, res) => {
  // Security: nur von intern aufrufbar
  const authHeader = req.headers['x-migration-key'];
  if (authHeader !== 'vit-migrate-2026') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const results = [];
  for (const stmt of STATEMENTS) {
    const result = await runSql(stmt);
    results.push({ sql: stmt.substring(0, 50) + '...', ...result });
  }

  res.json({ ok: true, results });
};
