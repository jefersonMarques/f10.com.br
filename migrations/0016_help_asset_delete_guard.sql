CREATE OR REPLACE FUNCTION f10_guard_help_asset_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM help_step_blocks
    WHERE asset_id = OLD.id
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

DROP TRIGGER IF EXISTS help_assets_delete_guard ON help_assets;
CREATE TRIGGER help_assets_delete_guard
BEFORE DELETE ON help_assets
FOR EACH ROW
EXECUTE FUNCTION f10_guard_help_asset_delete();
