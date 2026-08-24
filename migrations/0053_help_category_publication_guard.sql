CREATE OR REPLACE FUNCTION guard_published_help_category_deactivation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.active = true AND NEW.active = false AND EXISTS (
    SELECT 1
    FROM help_content_categories content_category
    INNER JOIN help_contents content
      ON content.id = content_category.content_id
    WHERE content_category.category_id = NEW.id
      AND content.status = 'published'
  ) THEN
    RAISE EXCEPTION 'HELP_CATEGORY_PUBLISHED_CONTENT';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS help_category_publication_guard ON help_categories;
CREATE TRIGGER help_category_publication_guard
BEFORE UPDATE OF active
ON help_categories
FOR EACH ROW
EXECUTE FUNCTION guard_published_help_category_deactivation();
