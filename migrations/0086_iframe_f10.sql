ALTER TABLE help_contents
ADD COLUMN IF NOT EXISTS content_kind text NOT NULL DEFAULT 'support_article';

DO $$
BEGIN
  ALTER TABLE help_contents
  ADD CONSTRAINT help_contents_content_kind_check
  CHECK (content_kind IN ('support_article', 'update'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS help_contents_kind_idx
ON help_contents(content_kind);

CREATE TABLE IF NOT EXISTS iframe_f10_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  requires_acknowledgement boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE iframe_f10_notices
  ADD CONSTRAINT iframe_f10_notices_severity_check
  CHECK (severity IN ('info', 'warning', 'critical'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS iframe_f10_notices_active_window_idx
ON iframe_f10_notices(active, starts_at, expires_at);
