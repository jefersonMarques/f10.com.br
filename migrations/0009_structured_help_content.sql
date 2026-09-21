DO $$ BEGIN
  CREATE TYPE help_block_type AS ENUM ('text', 'image', 'video', 'notice', 'link');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE help_asset_type AS ENUM ('image', 'video', 'file');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS help_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  ai_general_knowledge text NOT NULL DEFAULT '',
  status help_content_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  legacy_article_id uuid UNIQUE REFERENCES help_articles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_contents_status_idx ON help_contents(status);
CREATE INDEX IF NOT EXISTS help_contents_category_idx ON help_contents(category);
CREATE INDEX IF NOT EXISTS help_contents_updated_idx ON help_contents(updated_at DESC);

CREATE TABLE IF NOT EXISTS help_content_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES help_contents(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  ai_knowledge text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, sort_order)
);

CREATE INDEX IF NOT EXISTS help_content_steps_content_idx
  ON help_content_steps(content_id, sort_order);

CREATE TABLE IF NOT EXISTS help_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES help_contents(id) ON DELETE CASCADE,
  asset_type help_asset_type NOT NULL,
  source_url text,
  storage_key text,
  original_name text,
  mime_type text,
  alt_text text NOT NULL DEFAULT '',
  transcript text NOT NULL DEFAULT '',
  ai_summary text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_url IS NOT NULL OR storage_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS help_assets_content_idx ON help_assets(content_id);
CREATE INDEX IF NOT EXISTS help_assets_type_idx ON help_assets(asset_type);

CREATE TABLE IF NOT EXISTS help_step_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES help_content_steps(id) ON DELETE CASCADE,
  block_type help_block_type NOT NULL,
  text_content text NOT NULL DEFAULT '',
  asset_id uuid REFERENCES help_assets(id) ON DELETE SET NULL,
  link_url text,
  link_label text,
  notice_variant text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (step_id, sort_order)
);

CREATE INDEX IF NOT EXISTS help_step_blocks_step_idx
  ON help_step_blocks(step_id, sort_order);
CREATE INDEX IF NOT EXISTS help_step_blocks_asset_idx ON help_step_blocks(asset_id);

-- Migra artigos já existentes para o novo modelo sem alterar a Central pública atual.
INSERT INTO help_contents (
  id,
  slug,
  title,
  summary,
  ai_general_knowledge,
  status,
  published_at,
  legacy_article_id,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  article.id,
  article.slug,
  article.title,
  article.summary,
  '',
  article.status,
  article.published_at,
  article.id,
  article.created_by,
  article.updated_by,
  article.created_at,
  article.updated_at
FROM help_articles article
ON CONFLICT DO NOTHING;

INSERT INTO help_content_steps (
  content_id,
  title,
  description,
  ai_knowledge,
  sort_order,
  created_at,
  updated_at
)
SELECT
  content.id,
  'Passo 1',
  content.summary,
  '',
  10,
  content.created_at,
  content.updated_at
FROM help_contents content
WHERE content.legacy_article_id IS NOT NULL
ON CONFLICT (content_id, sort_order) DO NOTHING;

INSERT INTO help_step_blocks (
  step_id,
  block_type,
  text_content,
  sort_order,
  created_at,
  updated_at
)
SELECT
  step.id,
  'text',
  COALESCE(
    (
      SELECT string_agg(NULLIF(block ->> 'text', ''), E'\n\n')
      FROM jsonb_array_elements(article.body) AS block
    ),
    ''
  ),
  10,
  article.created_at,
  article.updated_at
FROM help_content_steps step
JOIN help_contents content ON content.id = step.content_id
JOIN help_articles article ON article.id = content.legacy_article_id
WHERE step.sort_order = 10
ON CONFLICT (step_id, sort_order) DO NOTHING;
