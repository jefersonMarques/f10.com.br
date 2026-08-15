ALTER TABLE remote_support_sessions
  ADD COLUMN IF NOT EXISTS provider_session_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS remote_support_sessions_provider_session_idx
  ON remote_support_sessions(provider_session_id, provider_session_expires_at);
