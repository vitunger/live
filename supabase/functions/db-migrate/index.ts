// Zoho Import Migration
// Tabellen: support_kontakte, support_tickets_import, support_wissensartikel
// RLS Policies + Claim-on-Login Trigger
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MIGRATION_STATEMENTS = [
  // 1. support_kontakte
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

  // 2. support_tickets_import
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

  // 3. support_wissensartikel
  `CREATE TABLE IF NOT EXISTS public.support_wissensartikel (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    zoho_id text UNIQUE,
    titel text NOT NULL,
    inhalt text,
    kategorie text,
    zoho_erstellt_am timestamptz,
    erstellt_am timestamptz DEFAULT now()
  )`,

  // RLS
  `ALTER TABLE public.support_kontakte ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.support_tickets_import ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.support_wissensartikel ENABLE ROW LEVEL SECURITY`,

  // Policies (IF NOT EXISTS via DO-Block)
  `DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_kontakte' AND policyname='support_kontakte_own') THEN
      CREATE POLICY "support_kontakte_own" ON public.support_kontakte FOR SELECT USING (
        portal_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
      );
    END IF;
  END $do$`,
  `DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_tickets_import' AND policyname='support_tickets_import_own') THEN
      CREATE POLICY "support_tickets_import_own" ON public.support_tickets_import FOR SELECT USING (
        portal_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
      );
    END IF;
  END $do$`,
  `DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_tickets_import' AND policyname='support_tickets_import_hq_update') THEN
      CREATE POLICY "support_tickets_import_hq_update" ON public.support_tickets_import FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_hq = true)
      );
    END IF;
  END $do$`,
  `DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_wissensartikel' AND policyname='support_wissensartikel_read') THEN
      CREATE POLICY "support_wissensartikel_read" ON public.support_wissensartikel FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
  END $do$`,

  // Claim-on-Login Trigger
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

  // Schema Cache neu laden
  `SELECT pg_notify('pgrst', 'reload schema')`,
];

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { db: { schema: 'public' } }
  );

  const results = [];
  for (const stmt of MIGRATION_STATEMENTS) {
    const preview = stmt.replace(/\s+/g, ' ').trim().slice(0, 60);
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt }).maybeSingle();
      if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
        // Fallback: direkt via fetch zur PostgREST SQL Endpoint
        const r2 = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql: stmt }),
        });
        if (!r2.ok) {
          results.push({ sql: preview, ok: false, error: error.message });
        } else {
          results.push({ sql: preview, ok: true });
        }
      } else {
        results.push({ sql: preview, ok: true });
      }
    } catch (e) {
      results.push({ sql: preview, ok: false, error: String(e) });
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
});
