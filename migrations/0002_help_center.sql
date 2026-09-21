DO $$ BEGIN
  CREATE TYPE help_content_status AS ENUM ('draft', 'review', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE help_destination_kind AS ENUM ('route', 'training', 'sequence', 'support');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS help_training_categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS help_training_videos (
  id text PRIMARY KEY,
  category_id text NOT NULL REFERENCES help_training_categories(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL,
  video_id text NOT NULL,
  audience text,
  is_essential boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  status help_content_status NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_training_videos_category_idx ON help_training_videos(category_id);
CREATE INDEX IF NOT EXISTS help_training_videos_status_idx ON help_training_videos(status);

CREATE TABLE IF NOT EXISTS help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  body jsonb NOT NULL DEFAULT '[]'::jsonb,
  status help_content_status NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_articles_status_idx ON help_articles(status);
CREATE INDEX IF NOT EXISTS help_articles_published_idx ON help_articles(published_at);

CREATE TABLE IF NOT EXISTS help_destinations (
  id text PRIMARY KEY,
  kind help_destination_kind NOT NULL,
  eyebrow text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  action_label text NOT NULL,
  icon text NOT NULL,
  href text,
  training_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  article_id uuid REFERENCES help_articles(id) ON DELETE SET NULL,
  status help_content_status NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_destinations_status_idx ON help_destinations(status);

CREATE TABLE IF NOT EXISTS help_questions (
  id text PRIMARY KEY,
  eyebrow text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  compact boolean NOT NULL DEFAULT false,
  search_label text,
  status help_content_status NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_questions_status_idx ON help_questions(status);

CREATE TABLE IF NOT EXISTS help_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id text NOT NULL REFERENCES help_questions(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  label text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  next_question_id text REFERENCES help_questions(id) ON DELETE SET NULL,
  destination_id text REFERENCES help_destinations(id) ON DELETE SET NULL,
  opens_search boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, option_key)
);

CREATE INDEX IF NOT EXISTS help_options_question_idx ON help_options(question_id, sort_order);
CREATE INDEX IF NOT EXISTS help_options_destination_idx ON help_options(destination_id);

CREATE TABLE IF NOT EXISTS help_search_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id text NOT NULL REFERENCES help_destinations(id) ON DELETE CASCADE,
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS help_search_aliases_normalized_idx ON help_search_aliases(normalized_alias);

CREATE TABLE IF NOT EXISTS help_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, version)
);

CREATE INDEX IF NOT EXISTS help_content_versions_entity_idx
  ON help_content_versions(entity_type, entity_id, version DESC);
