DO $$ BEGIN
  CREATE TYPE web_chat_ai_state AS ENUM ('active', 'escalated', 'human', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE web_chat_sessions
  ADD COLUMN IF NOT EXISTS ai_state web_chat_ai_state NOT NULL DEFAULT 'disabled',
  ADD COLUMN IF NOT EXISTS ai_handoff_reason text,
  ADD COLUMN IF NOT EXISTS ai_handoff_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_processing_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_last_run_id uuid REFERENCES support_ai_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS web_chat_sessions_ai_state_idx
  ON web_chat_sessions(ai_state, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS web_chat_sessions_ai_last_run_idx
  ON web_chat_sessions(ai_last_run_id)
  WHERE ai_last_run_id IS NOT NULL;
