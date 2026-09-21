CREATE TYPE help_knowledge_scope AS ENUM (
  'global',
  'article'
);

CREATE TYPE help_knowledge_resolution AS ENUM (
  'answered',
  'navigate',
  'found_elsewhere',
  'not_found',
  'failed'
);

CREATE TABLE help_knowledge_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source help_search_source NOT NULL,
  scope help_knowledge_scope NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  search_event_id uuid REFERENCES help_search_events(id) ON DELETE SET NULL,
  question text NOT NULL,
  normalized_query text NOT NULL,
  context_slug text NOT NULL DEFAULT '',
  resolution help_knowledge_resolution NOT NULL,
  target_content_id uuid REFERENCES help_contents(id) ON DELETE SET NULL,
  target_slug text NOT NULL DEFAULT '',
  target_type text NOT NULL DEFAULT '',
  source_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  provider_response_id text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer NOT NULL DEFAULT 0,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX help_knowledge_runs_created_idx
  ON help_knowledge_runs(created_at DESC);

CREATE INDEX help_knowledge_runs_resolution_idx
  ON help_knowledge_runs(resolution, created_at DESC);

CREATE INDEX help_knowledge_runs_source_idx
  ON help_knowledge_runs(source, created_at DESC);

CREATE INDEX help_knowledge_runs_normalized_query_idx
  ON help_knowledge_runs(normalized_query, created_at DESC);

CREATE INDEX help_knowledge_runs_target_content_idx
  ON help_knowledge_runs(target_content_id, created_at DESC);
