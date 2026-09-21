DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname
    INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'help_training_step_media'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%media_type%'
    AND pg_get_constraintdef(oid) ILIKE '%asset_id%'
    AND pg_get_constraintdef(oid) ILIKE '%source_url%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE help_training_step_media DROP CONSTRAINT %I', constraint_name);
  END IF;
END;
$$;

ALTER TABLE help_training_step_media
  ADD CONSTRAINT help_training_step_media_source_check
  CHECK (
    (media_type = 'image' AND asset_id IS NOT NULL AND source_url IS NULL)
    OR
    (
      media_type = 'video'
      AND source_url IS NOT NULL
      AND (
        (asset_id IS NULL AND source_url ~ '^https?://')
        OR
        (asset_id IS NOT NULL AND source_url = 'asset:' || asset_id::text)
      )
    )
  );

CREATE OR REPLACE FUNCTION f10_guard_help_asset_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM help_step_blocks WHERE asset_id = OLD.id
  ) OR EXISTS (
    SELECT 1 FROM help_training_step_media WHERE asset_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'HELP_ASSET_IN_USE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM help_publications publication
    WHERE publication.entity_type = 'content'
      AND jsonb_path_exists(
        publication.snapshot,
        '$.public.steps[*].blocks[*].asset ? (@.id == $assetId)',
        jsonb_build_object('assetId', to_jsonb(OLD.id::text))
      )
  ) OR EXISTS (
    SELECT 1
    FROM help_training_versions version
    WHERE jsonb_path_exists(
      version.snapshot,
      '$.steps[*].images[*] ? (@.assetId == $assetId)',
      jsonb_build_object('assetId', to_jsonb(OLD.id::text))
    )
      OR jsonb_path_exists(
        version.snapshot,
        '$.steps[*] ? (@.videoUrl == $videoRef)',
        jsonb_build_object('videoRef', to_jsonb('asset:' || OLD.id::text))
      )
  ) THEN
    RAISE EXCEPTION 'HELP_ASSET_PUBLISHED';
  END IF;

  IF OLD.storage_key IS NOT NULL
    AND current_setting('f10.allow_managed_asset_delete', true) IS DISTINCT FROM 'on'
  THEN
    RETURN NULL;
  END IF;

  RETURN OLD;
END;
$$;
