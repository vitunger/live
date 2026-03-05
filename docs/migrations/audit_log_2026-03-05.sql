-- ═══════════════════════════════════════════════════════════
-- audit_log Tabelle + RLS
-- Nur HQ kann lesen, alle authentifizierten User können schreiben
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.audit_log (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
    standort_id uuid REFERENCES public.standorte(id) ON DELETE SET NULL,
    aktion      text NOT NULL,          -- z.B. 'login', 'bwa_upload', 'lead_erstellt'
    modul       text,                   -- z.B. 'controlling', 'verkauf'
    details     jsonb DEFAULT '{}'::jsonb,  -- beliebige Zusatzdaten
    ip_hint     text                    -- optional, nur letztes Oktett
);

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id     ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_aktion      ON public.audit_log (aktion);
CREATE INDEX IF NOT EXISTS idx_audit_log_standort_id ON public.audit_log (standort_id);

-- RLS aktivieren
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Nur HQ darf lesen
CREATE POLICY "audit_log_hq_read" ON public.audit_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_hq = true
        )
    );

-- Alle authentifizierten User dürfen schreiben (INSERT only, kein UPDATE/DELETE)
CREATE POLICY "audit_log_insert" ON public.audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
