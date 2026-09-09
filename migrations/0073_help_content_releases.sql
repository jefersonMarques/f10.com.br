CREATE TABLE IF NOT EXISTS help_content_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES help_contents(id) ON DELETE CASCADE,
  release_number integer NOT NULL,
  public_snapshot jsonb NOT NULL,
  editor_snapshot jsonb,
  source_video_asset_id uuid REFERENCES help_assets(id) ON DELETE RESTRICT,
  change_summary text NOT NULL DEFAULT '',
  published_by uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS help_content_releases_content_number_unique
  ON help_content_releases(content_id, release_number);

CREATE INDEX IF NOT EXISTS help_content_releases_content_published_idx
  ON help_content_releases(content_id, published_at DESC);

CREATE TABLE IF NOT EXISTS help_content_release_assets (
  release_id uuid NOT NULL REFERENCES help_content_releases(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES help_assets(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT 'content',
  PRIMARY KEY (release_id, asset_id)
);

CREATE INDEX IF NOT EXISTS help_content_release_assets_asset_idx
  ON help_content_release_assets(asset_id);

INSERT INTO help_content_releases (
  content_id,
  release_number,
  public_snapshot,
  editor_snapshot,
  source_video_asset_id,
  change_summary,
  published_by,
  published_at
)
SELECT
  hp.entity_id::uuid,
  1,
  hp.snapshot,
  NULL,
  NULL,
  'Versão publicada antes do histórico de releases',
  hp.published_by,
  hp.published_at
FROM help_publications hp
JOIN help_contents hc ON hc.id::text = hp.entity_id
WHERE hp.entity_type = 'content'
  AND NOT EXISTS (
    SELECT 1
    FROM help_content_releases hcr
    WHERE hcr.content_id = hc.id
  );
