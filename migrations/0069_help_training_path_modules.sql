-- Trilhas passam a ser compostas por um ou mais módulos, cada um ligado a um conteúdo publicado.
-- O backfill transforma cada trilha existente em uma trilha de módulo único sem alterar sessões ou versões.

CREATE TABLE IF NOT EXISTS help_training_path_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL,
  source_content_id uuid NOT NULL,
  source_published_at timestamptz NOT NULL,
  source_publication_snapshot jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'help_training_path_items_path_fk'
  ) THEN
    ALTER TABLE help_training_path_items
      ADD CONSTRAINT help_training_path_items_path_fk
      FOREIGN KEY (path_id)
      REFERENCES help_training_paths(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'help_training_path_items_source_content_fk'
  ) THEN
    ALTER TABLE help_training_path_items
      ADD CONSTRAINT help_training_path_items_source_content_fk
      FOREIGN KEY (source_content_id)
      REFERENCES help_contents(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS help_training_path_items_content_unique
  ON help_training_path_items(path_id, source_content_id);

CREATE UNIQUE INDEX IF NOT EXISTS help_training_path_items_order_unique
  ON help_training_path_items(path_id, sort_order);

CREATE INDEX IF NOT EXISTS help_training_path_items_path_idx
  ON help_training_path_items(path_id, sort_order);

CREATE INDEX IF NOT EXISTS help_training_path_items_source_idx
  ON help_training_path_items(source_content_id);

INSERT INTO help_training_path_items (
  path_id,
  source_content_id,
  source_published_at,
  source_publication_snapshot,
  sort_order,
  created_at,
  updated_at
)
SELECT
  path.id,
  path.source_content_id,
  path.source_published_at,
  path.source_publication_snapshot,
  10,
  path.created_at,
  path.updated_at
FROM help_training_paths path
WHERE NOT EXISTS (
  SELECT 1
  FROM help_training_path_items item
  WHERE item.path_id = path.id
);

ALTER TABLE help_training_steps
  ADD COLUMN IF NOT EXISTS path_item_id uuid;

UPDATE help_training_steps step
SET path_item_id = item.id
FROM help_training_path_items item
WHERE step.path_item_id IS NULL
  AND item.path_id = step.path_id
  AND item.sort_order = (
    SELECT MIN(first_item.sort_order)
    FROM help_training_path_items first_item
    WHERE first_item.path_id = step.path_id
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'help_training_steps_path_item_fk'
  ) THEN
    ALTER TABLE help_training_steps
      ADD CONSTRAINT help_training_steps_path_item_fk
      FOREIGN KEY (path_item_id)
      REFERENCES help_training_path_items(id)
      ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE help_training_steps
  ALTER COLUMN path_item_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS help_training_steps_path_item_idx
  ON help_training_steps(path_item_id, sort_order);
