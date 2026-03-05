-- ═══════════════════════════════════════════════════════════
-- audit_log FIX Migration
-- Die Tabelle existiert bereits, aber ohne alle Spalten und FKs.
-- Diese Migration ergänzt alles Fehlende idempotent (IF NOT EXISTS / IF NOT EXISTS).
-- Stand: 2026-03-05
-- ═══════════════════════════════════════════════════════════

-- 1. Fehlende Spalten hinzufügen
ALTER TABLE public.audit_log
    ADD COLUMN IF NOT EXISTS standort_id uuid,
    ADD COLUMN IF NOT EXISTS aktion      text,
    ADD COLUMN IF NOT EXISTS modul       text,
    ADD COLUMN IF NOT EXISTS details     jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS ip_hint     text;

-- 2. Bestehende 'action' Spalte befüllen → aktion (falls legacy-Daten da sind)
UPDATE public.audit_log SET aktion = action WHERE aktion IS NULL AND action IS NOT NULL;

-- 3. aktion NOT NULL setzen (nach Datenmigration)
ALTER TABLE public.audit_log ALTER COLUMN aktion SET DEFAULT 'unbekannt';
UPDATE public.audit_log SET aktion = 'unbekannt' WHERE aktion IS NULL;
ALTER TABLE public.audit_log ALTER COLUMN aktion SET NOT NULL;

-- 4. Foreign Keys anlegen (mit explizitem Namen damit PostgREST den Join auflösen kann)
ALTER TABLE public.audit_log
    DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.audit_log
    DROP CONSTRAINT IF EXISTS audit_log_standort_id_fkey;
ALTER TABLE public.audit_log
    ADD CONSTRAINT audit_log_standort_id_fkey
    FOREIGN KEY (standort_id) REFERENCES public.standorte(id) ON DELETE SET NULL;

-- 5. Indizes (IF NOT EXISTS = idempotent)
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id     ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_aktion      ON public.audit_log (aktion);
CREATE INDEX IF NOT EXISTS idx_audit_log_standort_id ON public.audit_log (standort_id);

-- 6. RLS sicherstellen
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- HQ-Lese-Policy (nur wenn noch nicht vorhanden)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_log' AND policyname = 'audit_log_hq_read'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "audit_log_hq_read" ON public.audit_log
                FOR SELECT TO authenticated
                USING (
                    EXISTS (
                        SELECT 1 FROM public.users
                        WHERE users.id = auth.uid() AND users.is_hq = true
                    )
                )
        $policy$;
    END IF;
END $$;

-- Insert-Policy (alle authentifizierten User)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_log' AND policyname = 'audit_log_insert'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "audit_log_insert" ON public.audit_log
                FOR INSERT TO authenticated
                WITH CHECK (auth.uid() IS NOT NULL)
        $policy$;
    END IF;
END $$;

-- 7. Schema Cache neu laden (damit PostgREST den neuen FK sofort erkennt)
NOTIFY pgrst, 'reload schema';
