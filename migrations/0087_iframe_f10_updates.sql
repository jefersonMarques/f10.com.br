UPDATE iframe_f10_notices
SET expires_at = now()
WHERE expires_at IS NULL;

ALTER TABLE iframe_f10_notices
ALTER COLUMN expires_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS iframe_f10_updates (
  id uuid PRIMARY KEY,
  slug text NOT NULL,
  title text NOT NULL,
  body_markdown text NOT NULL,
  cover_storage_key text,
  cover_content_type text,
  cover_original_name text,
  pinned boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS iframe_f10_updates_slug_uidx
ON iframe_f10_updates(slug);

CREATE INDEX IF NOT EXISTS iframe_f10_updates_visibility_idx
ON iframe_f10_updates(active, pinned, expires_at);
