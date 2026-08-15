CREATE TABLE IF NOT EXISTS help_publications (
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  snapshot jsonb NOT NULL,
  published_by uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS help_publications_published_idx
  ON help_publications(published_at DESC);
