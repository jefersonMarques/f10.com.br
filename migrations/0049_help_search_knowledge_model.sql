DROP INDEX IF EXISTS help_search_documents_public_fts_idx;
DROP INDEX IF EXISTS help_search_documents_ai_fts_idx;

ALTER TABLE help_search_documents
  DROP COLUMN category,
  DROP COLUMN ai_text,
  ADD COLUMN category_text text NOT NULL DEFAULT '',
  ADD COLUMN search_aliases text NOT NULL DEFAULT '',
  ADD COLUMN assistant_text text NOT NULL DEFAULT '';

CREATE INDEX help_search_documents_public_fts_idx
  ON help_search_documents USING GIN (
    to_tsvector(
      'portuguese',
      coalesce(title, '') || ' ' ||
      coalesce(summary, '') || ' ' ||
      coalesce(category_text, '') || ' ' ||
      coalesce(public_text, '') || ' ' ||
      coalesce(search_aliases, '')
    )
  );

CREATE INDEX help_search_documents_assistant_fts_idx
  ON help_search_documents USING GIN (
    to_tsvector(
      'portuguese',
      coalesce(title, '') || ' ' ||
      coalesce(summary, '') || ' ' ||
      coalesce(category_text, '') || ' ' ||
      coalesce(public_text, '') || ' ' ||
      coalesce(search_aliases, '') || ' ' ||
      coalesce(assistant_text, '')
    )
  );

CREATE OR REPLACE FUNCTION sync_help_search_document_from_publication()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  category_text_value text;
  search_aliases_value text;
  public_text_value text;
  assistant_text_value text;
BEGIN
  IF NEW.entity_type <> 'content' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    string_agg(
      concat_ws(
        ' ',
        category ->> 'slug',
        category ->> 'name',
        category ->> 'description'
      ),
      ' '
    ),
    ''
  )
  INTO category_text_value
  FROM jsonb_array_elements(
    COALESCE(NEW.snapshot -> 'public' -> 'categories', '[]'::jsonb)
  ) AS category;

  SELECT COALESCE(string_agg(value, ' '), '')
  INTO search_aliases_value
  FROM jsonb_array_elements_text(
    COALESCE(NEW.snapshot -> 'knowledge' -> 'searchAliases', '[]'::jsonb)
  ) AS value;

  SELECT
    COALESCE(string_agg(fragment ->> 'publicText', ' '), ''),
    COALESCE(string_agg(fragment ->> 'assistantKnowledge', ' '), '')
  INTO public_text_value, assistant_text_value
  FROM jsonb_array_elements(
    COALESCE(NEW.snapshot -> 'knowledge' -> 'fragments', '[]'::jsonb)
  ) AS fragment;

  INSERT INTO help_search_documents (
    content_id,
    slug,
    title,
    summary,
    category_text,
    public_text,
    search_aliases,
    assistant_text,
    published_at,
    updated_at
  ) VALUES (
    NEW.entity_id::uuid,
    COALESCE(NEW.snapshot -> 'knowledge' ->> 'slug', ''),
    COALESCE(NEW.snapshot -> 'knowledge' ->> 'title', ''),
    COALESCE(NEW.snapshot -> 'public' ->> 'summary', ''),
    category_text_value,
    public_text_value,
    search_aliases_value,
    assistant_text_value,
    NEW.published_at,
    now()
  )
  ON CONFLICT (content_id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    category_text = EXCLUDED.category_text,
    public_text = EXCLUDED.public_text,
    search_aliases = EXCLUDED.search_aliases,
    assistant_text = EXCLUDED.assistant_text,
    published_at = EXCLUDED.published_at,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS help_publications_search_document_sync ON help_publications;
CREATE TRIGGER help_publications_search_document_sync
AFTER INSERT OR UPDATE OF snapshot, published_at
ON help_publications
FOR EACH ROW
EXECUTE FUNCTION sync_help_search_document_from_publication();

TRUNCATE TABLE help_search_documents;

INSERT INTO help_search_documents (
  content_id,
  slug,
  title,
  summary,
  category_text,
  public_text,
  search_aliases,
  assistant_text,
  published_at,
  updated_at
)
SELECT
  publication.entity_id::uuid,
  COALESCE(publication.snapshot -> 'knowledge' ->> 'slug', ''),
  COALESCE(publication.snapshot -> 'knowledge' ->> 'title', ''),
  COALESCE(publication.snapshot -> 'public' ->> 'summary', ''),
  COALESCE((
    SELECT string_agg(
      concat_ws(' ', category ->> 'slug', category ->> 'name', category ->> 'description'),
      ' '
    )
    FROM jsonb_array_elements(
      COALESCE(publication.snapshot -> 'public' -> 'categories', '[]'::jsonb)
    ) AS category
  ), ''),
  COALESCE((
    SELECT string_agg(fragment ->> 'publicText', ' ')
    FROM jsonb_array_elements(
      COALESCE(publication.snapshot -> 'knowledge' -> 'fragments', '[]'::jsonb)
    ) AS fragment
  ), ''),
  COALESCE((
    SELECT string_agg(value, ' ')
    FROM jsonb_array_elements_text(
      COALESCE(publication.snapshot -> 'knowledge' -> 'searchAliases', '[]'::jsonb)
    ) AS value
  ), ''),
  COALESCE((
    SELECT string_agg(fragment ->> 'assistantKnowledge', ' ')
    FROM jsonb_array_elements(
      COALESCE(publication.snapshot -> 'knowledge' -> 'fragments', '[]'::jsonb)
    ) AS fragment
  ), ''),
  publication.published_at,
  now()
FROM help_publications publication
WHERE publication.entity_type = 'content'
  AND publication.snapshot -> 'knowledge' ->> 'version' = '1';
