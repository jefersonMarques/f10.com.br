CREATE TABLE IF NOT EXISTS auth_password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_password_reset_tokens_token_unique
  ON auth_password_reset_tokens(token_hash);

CREATE INDEX IF NOT EXISTS auth_password_reset_tokens_user_idx
  ON auth_password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS auth_password_reset_tokens_expires_idx
  ON auth_password_reset_tokens(expires_at);
