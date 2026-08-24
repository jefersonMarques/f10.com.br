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
    RETURN COALESCE(NEW, OLD);
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
