// Temporäre Edge Function zur Ausführung der DB Migration
// Nach erfolgreicher Migration kann diese Function gelöscht werden
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MIGRATION_STATEMENTS = [
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
  `DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_abfragen' AND policyname='HQ full access perf_abfragen') THEN
      CREATE POLICY "HQ full access perf_abfragen" ON einkauf_performance_abfragen FOR ALL
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
    END IF;
  END $do$`,
  `DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_abfragen' AND policyname='Partner read perf_abfragen') THEN
      CREATE POLICY "Partner read perf_abfragen" ON einkauf_performance_abfragen FOR SELECT
      USING (status = 'offen');
    END IF;
  END $do$`,
  `CREATE TABLE IF NOT EXISTS einkauf_performance_daten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    abfrage_id UUID NOT NULL REFERENCES einkauf_performance_abfragen(id) ON DELETE CASCADE,
    standort_id UUID NOT NULL REFERENCES standorte(id) ON DELETE CASCADE,
    marke TEXT NOT NULL,
    absatz_aktuell NUMERIC, absatz_vorjahr NUMERIC,
    umsatz_aktuell NUMERIC, umsatz_vorjahr NUMERIC,
    lager_stueck NUMERIC, lager_wert NUMERIC,
    rabatt_aktuell NUMERIC, rabatt_vorjahr NUMERIC,
    rohertrag_aktuell NUMERIC, rohertrag_vorjahr NUMERIC,
    abgeschlossen BOOLEAN DEFAULT false,
    erstellt_am TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `ALTER TABLE einkauf_performance_daten ENABLE ROW LEVEL SECURITY`,
  `DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_daten' AND policyname='HQ read all perf_daten') THEN
      CREATE POLICY "HQ read all perf_daten" ON einkauf_performance_daten FOR SELECT
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
    END IF;
  END $do$`,
  `DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_daten' AND policyname='Partner select own perf_daten') THEN
      CREATE POLICY "Partner select own perf_daten" ON einkauf_performance_daten FOR SELECT
      USING (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()));
    END IF;
  END $do$`,
  `DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_daten' AND policyname='Partner insert own perf_daten') THEN
      CREATE POLICY "Partner insert own perf_daten" ON einkauf_performance_daten FOR INSERT
      WITH CHECK (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()));
    END IF;
  END $do$`,
  `DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_daten' AND policyname='Partner update own perf_daten') THEN
      CREATE POLICY "Partner update own perf_daten" ON einkauf_performance_daten FOR UPDATE
      USING (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()));
    END IF;
  END $do$`,
  `DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='einkauf_performance_daten' AND policyname='Partner delete own perf_daten') THEN
      CREATE POLICY "Partner delete own perf_daten" ON einkauf_performance_daten FOR DELETE
      USING (standort_id = (SELECT standort_id FROM users WHERE id = auth.uid()) AND abgeschlossen = false);
    END IF;
  END $do$`,
  `CREATE INDEX IF NOT EXISTS idx_ekperf_daten_abfrage ON einkauf_performance_daten(abfrage_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ekperf_daten_standort ON einkauf_performance_daten(standort_id)`,
]

Deno.serve(async (_req) => {
  const dbUrl = Deno.env.get('SUPABASE_DB_URL')
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: 'SUPABASE_DB_URL not available' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Use Deno postgres driver
  const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
  const client = new Client(dbUrl)
  await client.connect()

  const results = []
  for (const sql of MIGRATION_STATEMENTS) {
    try {
      await client.queryArray(sql)
      results.push({ sql: sql.substring(0, 50).replace(/\s+/g, ' '), ok: true })
    } catch (e: any) {
      results.push({ sql: sql.substring(0, 50).replace(/\s+/g, ' '), ok: false, error: e.message })
    }
  }

  await client.end()

  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  })
})
