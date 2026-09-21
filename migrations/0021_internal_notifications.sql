CREATE TABLE IF NOT EXISTS internal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  href text NOT NULL,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS internal_notifications_user_created_idx
  ON internal_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS internal_notifications_user_read_idx
  ON internal_notifications(user_id, read_at);

CREATE INDEX IF NOT EXISTS internal_notifications_entity_idx
  ON internal_notifications(entity_type, entity_id);
