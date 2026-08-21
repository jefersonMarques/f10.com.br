CREATE TABLE IF NOT EXISTS help_content_featured_videos (
  content_id uuid PRIMARY KEY REFERENCES help_contents(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES help_assets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS help_content_featured_videos_asset_unique
  ON help_content_featured_videos(asset_id);

CREATE INDEX IF NOT EXISTS help_content_featured_videos_updated_idx
  ON help_content_featured_videos(updated_at);

WITH single_video AS (
  SELECT
    steps.content_id,
    MIN(blocks.asset_id::text)::uuid AS asset_id
  FROM help_step_blocks AS blocks
  INNER JOIN help_content_steps AS steps ON steps.id = blocks.step_id
  WHERE blocks.block_type = 'video'
    AND blocks.asset_id IS NOT NULL
  GROUP BY steps.content_id
  HAVING COUNT(*) = 1
)
INSERT INTO help_content_featured_videos (content_id, asset_id)
SELECT content_id, asset_id
FROM single_video
ON CONFLICT (content_id) DO NOTHING;

DELETE FROM help_step_blocks AS blocks
USING help_content_steps AS steps, help_content_featured_videos AS featured
WHERE blocks.step_id = steps.id
  AND steps.content_id = featured.content_id
  AND blocks.block_type = 'video'
  AND blocks.asset_id = featured.asset_id;
