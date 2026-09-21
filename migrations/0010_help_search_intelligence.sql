CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE help_search_source AS ENUM ('public', 'operations', 'chat_ai', 'support_agent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS help_search_documents (
  content_id uuid PRIMARY KEY REFERENCES help_contents(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  public_text text NOT NULL DEFAULT '',
  ai_text text NOT NULL DEFAULT '',
  published_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_search_documents_title_trgm_idx
  ON help_search_documents USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS help_search_documents_summary_trgm_idx
  ON help_search_documents USING GIN (summary gin_trgm_ops);
CREATE INDEX IF NOT EXISTS help_search_documents_public_fts_idx
  ON help_search_documents USING GIN (
    to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(public_text, ''))
  );
CREATE INDEX IF NOT EXISTS help_search_documents_ai_fts_idx
  ON help_search_documents USING GIN (
    to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(public_text, '') || ' ' || coalesce(ai_text, ''))
  );

CREATE TABLE IF NOT EXISTS help_search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  source help_search_source NOT NULL,
  query text NOT NULL,
  normalized_query text NOT NULL,
  result_count integer NOT NULL DEFAULT 0,
  selected_content_id uuid REFERENCES help_contents(id) ON DELETE SET NULL,
  ai_answered boolean NOT NULL DEFAULT false,
  escalated boolean NOT NULL DEFAULT false,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_search_events_created_idx ON help_search_events(created_at DESC);
CREATE INDEX IF NOT EXISTS help_search_events_normalized_idx ON help_search_events(normalized_query);
CREATE INDEX IF NOT EXISTS help_search_events_source_idx ON help_search_events(source, created_at DESC);
CREATE INDEX IF NOT EXISTS help_search_events_no_results_idx
  ON help_search_events(created_at DESC) WHERE result_count = 0;

CREATE TABLE IF NOT EXISTS help_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_event_id uuid NOT NULL REFERENCES help_search_events(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES help_contents(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  score double precision NOT NULL DEFAULT 0,
  title_snapshot text NOT NULL,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (search_event_id, content_id)
);

CREATE INDEX IF NOT EXISTS help_search_results_event_idx
  ON help_search_results(search_event_id, rank);
CREATE INDEX IF NOT EXISTS help_search_results_content_idx
  ON help_search_results(content_id, created_at DESC);

CREATE OR REPLACE FUNCTION sync_help_search_document_from_publication()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.entity_type <> 'content' THEN
    RETURN NEW;
  END IF;

  INSERT INTO help_search_documents (
    content_id,
    slug,
    title,
    summary,
    category,
    public_text,
    ai_text,
    published_at,
    updated_at
  ) VALUES (
    NEW.entity_id::uuid,
    COALESCE(NEW.snapshot -> 'public' ->> 'slug', ''),
    COALESCE(NEW.snapshot -> 'public' ->> 'title', ''),
    COALESCE(NEW.snapshot -> 'public' ->> 'summary', ''),
    COALESCE(NEW.snapshot -> 'public' ->> 'category', ''),
    COALESCE((NEW.snapshot -> 'public' -> 'steps')::text, ''),
    COALESCE((NEW.snapshot -> 'ai')::text, ''),
    NEW.published_at,
    now()
  )
  ON CONFLICT (content_id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    category = EXCLUDED.category,
    public_text = EXCLUDED.public_text,
    ai_text = EXCLUDED.ai_text,
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

-- Garante que publicações estruturadas existentes também tenham documento de busca.
INSERT INTO help_search_documents (
  content_id,
  slug,
  title,
  summary,
  category,
  public_text,
  ai_text,
  published_at,
  updated_at
)
SELECT
  publication.entity_id::uuid,
  COALESCE(publication.snapshot -> 'public' ->> 'slug', ''),
  COALESCE(publication.snapshot -> 'public' ->> 'title', ''),
  COALESCE(publication.snapshot -> 'public' ->> 'summary', ''),
  COALESCE(publication.snapshot -> 'public' ->> 'category', ''),
  COALESCE((publication.snapshot -> 'public' -> 'steps')::text, ''),
  COALESCE((publication.snapshot -> 'ai')::text, ''),
  publication.published_at,
  now()
FROM help_publications publication
WHERE publication.entity_type = 'content'
ON CONFLICT (content_id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  category = EXCLUDED.category,
  public_text = EXCLUDED.public_text,
  ai_text = EXCLUDED.ai_text,
  published_at = EXCLUDED.published_at,
  updated_at = now();
