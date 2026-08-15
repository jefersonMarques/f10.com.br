ALTER TYPE help_block_type ADD VALUE IF NOT EXISTS 'file';

ALTER TABLE help_assets
  ALTER COLUMN content_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS size_bytes bigint,
  ADD COLUMN IF NOT EXISTS checksum_sha256 text;

CREATE INDEX IF NOT EXISTS help_assets_checksum_idx
  ON help_assets(checksum_sha256)
  WHERE checksum_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS help_assets_storage_key_idx
  ON help_assets(storage_key)
  WHERE storage_key IS NOT NULL;
