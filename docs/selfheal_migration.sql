-- Self-Healing Error Log
CREATE TABLE IF NOT EXISTS error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  standort_id uuid REFERENCES standorte(id) ON DELETE SET NULL,
  message text NOT NULL,
  source_file text,
  line_number int,
  col_number int,
  stack text,
  url text,
  user_agent text,
  module text,
  count int DEFAULT 1,
  last_seen_at timestamptz DEFAULT now(),
  -- KI analysis
  ki_analysiert boolean DEFAULT false,
  ki_root_cause text,
  ki_fix_vorschlag text,
  ki_fix_code text,         -- the actual code patch
  ki_fix_datei text,        -- which file to patch
  ki_fix_alt text,          -- old string (for str_replace)
  ki_fix_neu text,          -- new string (for str_replace)
  ki_confidence int,        -- 0-100
  -- Deploy tracking
  fix_status text DEFAULT 'offen',  -- offen | approved | deployed | rejected
  fix_deployed_at timestamptz,
  fix_deployed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  fix_commit_sha text
);

-- Unique constraint: same error message + file → upsert by count
CREATE UNIQUE INDEX IF NOT EXISTS error_log_dedup 
  ON error_log(message, COALESCE(source_file, ''));

-- RLS
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY error_log_insert ON error_log FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY error_log_select ON error_log FOR SELECT 
  USING (
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true)
    OR user_id = auth.uid()
  );

CREATE POLICY error_log_update ON error_log FOR UPDATE
  USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND is_hq = true));
