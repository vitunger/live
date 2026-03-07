// Zoho Import Migration – support_kontakte, support_tickets_import, support_wissensartikel
// Claim-on-Login Trigger, RLS Policies
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lwwagbkxeofahhwebkab.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STATEMENTS = [
`CREATE TABLE IF NOT EXISTS public.support_kontakte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zoho_id text UNIQUE,
  email text NOT NULL,
  vorname text,
  nachname text,
  telefon text,
  portal_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  zoho_erstellt_am timestamptz,
  erstellt_am timestamptz DEFAULT now()
)`,
`CREATE INDEX IF NOT EXISTS idx_support_kontakte_email ON public.support_kontakte(email)`,
`CREATE INDEX IF NOT EXISTS idx_support_kontakte_portal_user ON public.support_kontakte(portal_user_id)`,
`CREATE TABLE IF NOT EXISTS public.support_tickets_import (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zoho_id text UNIQUE,
  zoho_nr text,
  kontakt_email text,
  portal_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  betreff text NOT NULL,
  beschreibung text,
  resolution text,
  status text NOT NULL DEFAULT 'offen'
    CHECK (status IN ('offen','in_bearbeitung','warten_extern','warten_rueckmeldung','warten_termin','geschlossen')),
  prioritaet text NOT NULL DEFAULT 'mittel'
    CHECK (prioritaet IN ('niedrig','mittel','hoch')),
  ist_offen boolean NOT NULL DEFAULT false,
  kanal text,
  tags text,
  zoho_erstellt_am timestamptz,
  zoho_geschlossen_am timestamptz,
  erstellt_am timestamptz DEFAULT now()
)`,
`CREATE INDEX IF NOT EXISTS idx_sti_email ON public.support_tickets_import(kontakt_email)`,
`CREATE INDEX IF NOT EXISTS idx_sti_portal_user ON public.support_tickets_import(portal_user_id)`,
`CREATE INDEX IF NOT EXISTS idx_sti_status ON public.support_tickets_import(status)`,
`CREATE INDEX IF NOT EXISTS idx_sti_ist_offen ON public.support_tickets_import(ist_offen)`,
`CREATE TABLE IF NOT EXISTS public.support_wissensartikel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zoho_id text UNIQUE,
  titel text NOT NULL,
  inhalt text,
  kategorie text,
  zoho_erstellt_am timestamptz,
  erstellt_am timestamptz DEFAULT now()
)`,
`ALTER TABLE public.support_kontakte ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE public.support_tickets_import ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE public.support_wissensartikel ENABLE ROW LEVEL SECURITY`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_kontakte' AND policyname='support_kontakte_own') THEN
    CREATE POLICY "support_kontakte_own" ON public.support_kontakte FOR SELECT USING (
      portal_user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
    );
  END IF;
END $$`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_tickets_import' AND policyname='support_tickets_import_own') THEN
    CREATE POLICY "support_tickets_import_own" ON public.support_tickets_import FOR SELECT USING (
      portal_user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
    );
  END IF;
END $$`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_tickets_import' AND policyname='support_tickets_import_hq_update') THEN
    CREATE POLICY "support_tickets_import_hq_update" ON public.support_tickets_import FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
    );
  END IF;
END $$`,
`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_wissensartikel' AND policyname='support_wissensartikel_read') THEN
    CREATE POLICY "support_wissensartikel_read" ON public.support_wissensartikel FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$`,
`CREATE OR REPLACE FUNCTION public.claim_support_history()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.support_kontakte SET portal_user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email) AND portal_user_id IS NULL;
  UPDATE public.support_tickets_import SET portal_user_id = NEW.id
  WHERE LOWER(kontakt_email) = LOWER(NEW.email) AND portal_user_id IS NULL;
  RETURN NEW;
END;
$$`,
`DROP TRIGGER IF EXISTS trg_claim_support_history ON public.users`,
`CREATE TRIGGER trg_claim_support_history
  AFTER INSERT OR UPDATE OF email ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.claim_support_history()`,
`SELECT pg_notify('pgrst', 'reload schema')`,
];

async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) {
    const err = await res.text();
    // IF NOT EXISTS Fehler sind OK
    if (err.includes('already exists') || err.includes('does not exist')) return { ok: true };
    return { ok: false, error: err.slice(0, 200) };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert' });
  }

  const results = [];
  for (const stmt of STATEMENTS) {
    const preview = stmt.replace(/\s+/g, ' ').trim().slice(0, 70);
    const result = await execSQL(stmt);
    results.push({ sql: preview, ...result });
  }

  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  return res.status(200).json({ ok, fail, results });
}
