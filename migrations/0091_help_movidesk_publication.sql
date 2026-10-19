-- Publicação supervisionada e retomável de artigos já aprovados.
-- Não altera o conteúdo dos artigos, permissões ou revisões humanas.
CREATE TABLE IF NOT EXISTS help_movidesk_publication_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  phase text NOT NULL DEFAULT 'idle',
  source_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  cursor integer NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_by uuid REFERENCES users(id) ON DELETE SET NULL,
  next_request_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
