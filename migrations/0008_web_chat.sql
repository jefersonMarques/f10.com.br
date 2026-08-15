CREATE TABLE IF NOT EXISTS web_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  context_url text,
  context_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_chat_sessions_expires_idx
  ON web_chat_sessions(expires_at);
CREATE INDEX IF NOT EXISTS web_chat_sessions_last_seen_idx
  ON web_chat_sessions(last_seen_at DESC);

CREATE TABLE IF NOT EXISTS support_public_limits (
  key text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
