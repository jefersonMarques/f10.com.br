CREATE TABLE IF NOT EXISTS customer_auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_contact_id uuid NOT NULL REFERENCES customer_contacts(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_user_id text,
  login text NOT NULL,
  password_hash text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_auth_provider_check CHECK (provider IN ('portal', 'f10')),
  CONSTRAINT customer_auth_portal_password_check CHECK (provider <> 'portal' OR password_hash IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_auth_provider_login_unique
  ON customer_auth_identities(provider, lower(login));

CREATE UNIQUE INDEX IF NOT EXISTS customer_auth_provider_user_unique
  ON customer_auth_identities(provider, provider_user_id)
  WHERE provider_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS customer_auth_contact_idx
  ON customer_auth_identities(customer_contact_id, provider);

CREATE TABLE IF NOT EXISTS customer_auth_activation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES customer_auth_identities(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_auth_activation_expiry_idx
  ON customer_auth_activation_tokens(expires_at)
  WHERE used_at IS NULL;

INSERT INTO customer_auth_identities (
  customer_contact_id,
  provider,
  provider_user_id,
  login,
  verified_at,
  created_at,
  updated_at
)
SELECT
  customer_contact_id,
  'f10',
  legacy_user_id,
  login_email,
  last_authenticated_at,
  created_at,
  updated_at
FROM customer_f10_identities
ON CONFLICT DO NOTHING;
