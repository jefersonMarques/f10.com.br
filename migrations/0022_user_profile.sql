CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_key text,
  avatar_content_type text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
