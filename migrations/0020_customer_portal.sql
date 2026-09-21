CREATE TABLE IF NOT EXISTS customer_portal_login_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_contact_id uuid NOT NULL REFERENCES customer_contacts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_portal_login_tokens_contact_idx
  ON customer_portal_login_tokens(customer_contact_id, expires_at);

CREATE INDEX IF NOT EXISTS customer_portal_login_tokens_expiry_idx
  ON customer_portal_login_tokens(expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS customer_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_contact_id uuid NOT NULL REFERENCES customer_contacts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_portal_sessions_contact_idx
  ON customer_portal_sessions(customer_contact_id, expires_at);

CREATE INDEX IF NOT EXISTS customer_portal_sessions_expiry_idx
  ON customer_portal_sessions(expires_at)
  WHERE revoked_at IS NULL;
