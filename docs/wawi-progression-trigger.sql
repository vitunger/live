-- =============================================================
-- WaWi → Pipeline Auto-Progression Trigger
-- Run this in Supabase SQL Editor
-- =============================================================

-- When a lead_event is inserted with a WaWi event type,
-- automatically move the lead to the corresponding pipeline stage.
-- Only moves FORWARD (never backward).

CREATE OR REPLACE FUNCTION process_lead_event_progression()
RETURNS TRIGGER AS $$
DECLARE
    current_status TEXT;
    target_status TEXT;
    stage_order TEXT[] := ARRAY['neu', 'angebot', 'schwebend', 'gewonnen', 'verloren', 'gold'];
    current_idx INT;
    target_idx INT;
BEGIN
    -- Determine target status based on event type
    CASE NEW.event_typ
        WHEN 'etermin_buchung' THEN
            -- eTermin: update sales.terminDone on leads table
            UPDATE leads
            SET sales_data = COALESCE(sales_data, '{}'::jsonb) || '{"terminDone": true}'::jsonb,
                updated_at = now()
            WHERE id = NEW.lead_id;
            RETURN NEW;
        WHEN 'wawi_angebot' THEN target_status := 'angebot';
        WHEN 'wawi_auftrag' THEN target_status := 'schwebend';
        WHEN 'wawi_rechnung' THEN target_status := 'gewonnen';
        ELSE RETURN NEW; -- Unknown event type, do nothing
    END CASE;

    -- Get current lead status
    SELECT status INTO current_status FROM leads WHERE id = NEW.lead_id;
    IF NOT FOUND THEN RETURN NEW; END IF;

    -- Calculate stage order indices
    current_idx := array_position(stage_order, current_status);
    target_idx := array_position(stage_order, target_status);

    -- Only move forward, never backward
    IF current_idx IS NULL OR target_idx IS NULL THEN
        -- Unknown status, just update
        UPDATE leads SET status = target_status, updated_at = now() WHERE id = NEW.lead_id;
    ELSIF target_idx > current_idx THEN
        UPDATE leads SET status = target_status, updated_at = now() WHERE id = NEW.lead_id;
    END IF;
    -- If target_idx <= current_idx, do nothing (already at or past this stage)

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_lead_event_progression ON lead_events;

-- Create trigger: fires on every new lead_event insert
CREATE TRIGGER trg_lead_event_progression
    AFTER INSERT ON lead_events
    FOR EACH ROW
    EXECUTE FUNCTION process_lead_event_progression();

-- Grant execute to service_role (for Edge Functions / webhooks)
GRANT EXECUTE ON FUNCTION process_lead_event_progression() TO service_role;
