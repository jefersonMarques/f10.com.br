CREATE TABLE IF NOT EXISTS help_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS help_categories_slug_unique
  ON help_categories(slug);

CREATE INDEX IF NOT EXISTS help_categories_active_order_idx
  ON help_categories(active, sort_order);

CREATE TABLE IF NOT EXISTS help_training_path_categories (
  path_id uuid NOT NULL REFERENCES help_training_paths(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES help_categories(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (path_id, category_id)
);

CREATE INDEX IF NOT EXISTS help_training_path_categories_category_idx
  ON help_training_path_categories(category_id, sort_order);

CREATE INDEX IF NOT EXISTS help_training_path_categories_path_idx
  ON help_training_path_categories(path_id);
