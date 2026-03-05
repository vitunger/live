-- RPC: release_notification_to_all
-- SECURITY DEFINER damit HQ-User Notifications für alle aktiven User erstellen kann
CREATE OR REPLACE FUNCTION public.create_release_notification_all(
    p_titel TEXT,
    p_version TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_title TEXT;
    v_count INT;
BEGIN
    v_title := CASE WHEN p_version IS NOT NULL AND p_version != ''
                    THEN p_version || ': ' || p_titel
                    ELSE p_titel END;

    INSERT INTO notifications (user_id, type, icon, title, description, read, action_view)
    SELECT
        u.id,
        'hq',
        '📣',
        v_title,
        'Ein neues Release wurde veröffentlicht. Schau rein!',
        false,
        'entwicklung'
    FROM users u
    WHERE u.status = 'aktiv';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Nur authentifizierte User (HQ) dürfen die Funktion aufrufen
REVOKE ALL ON FUNCTION public.create_release_notification_all FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_release_notification_all TO authenticated;
