INSERT INTO help_categories (
  slug,
  name,
  description,
  icon,
  destination_url,
  sort_order,
  active
)
VALUES (
  'uncategorized',
  'Sem categoria',
  'Categoria técnica usada somente em rascunhos criados automaticamente. Substitua por categorias reais antes de publicar.',
  '',
  '',
  10000,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  destination_url = '',
  sort_order = 10000,
  active = true,
  updated_at = now();

CREATE OR REPLACE FUNCTION protect_help_uncategorized_category()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.slug <> 'uncategorized' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'HELP_UNCATEGORIZED_PROTECTED';
  END IF;

  IF NEW.slug <> 'uncategorized' OR NEW.active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'HELP_UNCATEGORIZED_PROTECTED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS help_uncategorized_category_guard ON help_categories;
CREATE TRIGGER help_uncategorized_category_guard
BEFORE UPDATE OR DELETE
ON help_categories
FOR EACH ROW
EXECUTE FUNCTION protect_help_uncategorized_category();

CREATE OR REPLACE FUNCTION reject_uncategorized_help_publication()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.entity_type = 'content' AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE(NEW.snapshot -> 'public' -> 'categories', '[]'::jsonb)
    ) AS category
    WHERE category ->> 'slug' = 'uncategorized'
  ) THEN
    RAISE EXCEPTION 'CONTENT_REAL_CATEGORY_REQUIRED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS help_publications_real_category_guard ON help_publications;
CREATE TRIGGER help_publications_real_category_guard
BEFORE INSERT OR UPDATE OF snapshot
ON help_publications
FOR EACH ROW
EXECUTE FUNCTION reject_uncategorized_help_publication();
