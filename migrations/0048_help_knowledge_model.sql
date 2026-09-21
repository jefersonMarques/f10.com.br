ALTER TABLE help_categories
  ADD COLUMN destination_url text NOT NULL DEFAULT '';

ALTER TABLE help_contents
  DROP COLUMN category,
  DROP COLUMN ai_general_knowledge,
  ADD COLUMN search_aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN assistant_knowledge text NOT NULL DEFAULT '',
  ADD COLUMN internal_support_notes text NOT NULL DEFAULT '';

CREATE TABLE help_content_categories (
  content_id uuid NOT NULL REFERENCES help_contents(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES help_categories(id) ON DELETE RESTRICT,
  destination_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_id, category_id)
);

CREATE INDEX help_content_categories_category_idx
  ON help_content_categories(category_id, sort_order);

CREATE INDEX help_content_categories_content_idx
  ON help_content_categories(content_id, sort_order);

ALTER TABLE help_content_steps
  DROP COLUMN ai_knowledge,
  ADD COLUMN assistant_knowledge text NOT NULL DEFAULT '';

ALTER TABLE help_assets
  DROP COLUMN transcript,
  DROP COLUMN ai_summary,
  ADD COLUMN assistant_description text NOT NULL DEFAULT '',
  ADD COLUMN subtitles text NOT NULL DEFAULT '',
  ADD COLUMN assistant_summary text NOT NULL DEFAULT '',
  ADD COLUMN extracted_text text NOT NULL DEFAULT '';
