ALTER TABLE remote_support_sessions
  ADD COLUMN IF NOT EXISTS started_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ended_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS remote_support_sessions_started_by_idx
  ON remote_support_sessions(started_by_user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS remote_support_sessions_ended_by_idx
  ON remote_support_sessions(ended_by_user_id, ended_at DESC);
