ALTER TABLE help_assets
  ALTER COLUMN content_id DROP NOT NULL;

ALTER TABLE help_assets
  DROP CONSTRAINT IF EXISTS help_assets_content_id_fkey;

ALTER TABLE help_assets
  ADD CONSTRAINT help_assets_content_id_fkey
  FOREIGN KEY (content_id)
  REFERENCES help_contents(id)
  ON DELETE SET NULL;
