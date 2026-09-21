ALTER TABLE help_contents
  ADD COLUMN IF NOT EXISTS import_source text,
  ADD COLUMN IF NOT EXISTS import_external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS help_contents_import_identity_unique
  ON help_contents(import_source, import_external_id)
  WHERE import_source IS NOT NULL
    AND import_external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS help_contents_import_source_idx
  ON help_contents(import_source)
  WHERE import_source IS NOT NULL;
