-- Inventário temporário do Movidesk. Não altera nem remove artigos existentes.
CREATE TABLE IF NOT EXISTS help_movidesk_import_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  phase text NOT NULL DEFAULT 'idle',
  next_page integer NOT NULL DEFAULT 0,
  total_count integer,
  next_request_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  started_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS help_movidesk_articles (
  source_id bigint PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  source_url text NOT NULL,
  source_html text,
  source_text text,
  source_revision bigint,
  source_updated_at timestamptz,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_id uuid REFERENCES help_contents(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'discovered',
  needs_review boolean NOT NULL DEFAULT true,
  issue text,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  imported_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_movidesk_articles_state_idx ON help_movidesk_articles(state, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS help_movidesk_articles_content_idx ON help_movidesk_articles(content_id);
