-- ═══════════════════════════════════════════════════════════
-- audit_log FIX Migration (final)
-- Stand: 2026-03-05
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.audit_log
    ADD COLUMN IF NOT EXISTS standort_id uuid,
    ADD COLUMN IF NOT EXISTS aktion      text,
    ADD COLUMN IF NOT EXISTS modul       text,
    ADD COLUMN IF NOT EXISTS details     jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS ip_hint     text;

UPDATE public.audit_log SET aktion = action WHERE aktion IS NULL AND action IS NOT NULL;

ALTER TABLE public.audit_log ALTER COLUMN aktion SET DEFAULT 'unbekannt';
UPDATE public.audit_log SET aktion = 'unbekannt' WHERE aktion IS NULL;

-- KEIN FK auf user_id: kaputte auth-Einträge (unconfirmed signup probes wie Dominik Wessling)
-- würden jeden INSERT in audit_log blockieren.
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;

ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_standort_id_fkey;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_standort_id_fkey
    FOREIGN KEY (standort_id) REFERENCES public.standorte(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id     ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_aktion      ON public.audit_log (aktion);
CREATE INDEX IF NOT EXISTS idx_audit_log_standort_id ON public.audit_log (standort_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_log' AND policyname='audit_log_hq_read') THEN
        CREATE POLICY "audit_log_hq_read" ON public.audit_log FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_hq = true));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_log' AND policyname='audit_log_insert') THEN
        CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
