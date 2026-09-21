CREATE TABLE IF NOT EXISTS google_calendar_connections (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  google_email text NOT NULL DEFAULT '',
  refresh_token_encrypted text NOT NULL,
  scope text NOT NULL DEFAULT '',
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS google_calendar_connections_updated_idx
  ON google_calendar_connections(updated_at DESC);
