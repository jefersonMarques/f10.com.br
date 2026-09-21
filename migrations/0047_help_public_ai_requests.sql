CREATE TABLE IF NOT EXISTS help_public_ai_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL,
  ip_key text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  model text NOT NULL DEFAULT '',
  input_tokens integer,
  output_tokens integer,
  failure_code text,
  started_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz NOT NULL,
  finished_at timestamptz,
  CONSTRAINT help_public_ai_requests_status_check
    CHECK (status IN ('running', 'answered', 'not_found', 'failed', 'expired'))
);

CREATE UNIQUE INDEX IF NOT EXISTS help_public_ai_requests_active_session_unique
  ON help_public_ai_requests(session_key)
  WHERE finished_at IS NULL;

CREATE INDEX IF NOT EXISTS help_public_ai_requests_session_started_idx
  ON help_public_ai_requests(session_key, started_at DESC);

CREATE INDEX IF NOT EXISTS help_public_ai_requests_ip_started_idx
  ON help_public_ai_requests(ip_key, started_at DESC);

CREATE INDEX IF NOT EXISTS help_public_ai_requests_started_idx
  ON help_public_ai_requests(started_at DESC);
