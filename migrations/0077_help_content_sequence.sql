CREATE SEQUENCE IF NOT EXISTS help_content_sort_order_seq
  AS integer
  START WITH 10
  INCREMENT BY 10;

ALTER TABLE help_contents
  ADD COLUMN IF NOT EXISTS sort_order integer;

WITH ordered AS (
  SELECT
    id,
    (row_number() OVER (ORDER BY title ASC, created_at ASC, id ASC) * 10)::integer AS sort_order
  FROM help_contents
)
UPDATE help_contents AS content
SET sort_order = ordered.sort_order
FROM ordered
WHERE ordered.id = content.id;

SELECT setval(
  'help_content_sort_order_seq',
  GREATEST((SELECT COALESCE(MAX(sort_order), 0) FROM help_contents), 10),
  true
);

ALTER SEQUENCE help_content_sort_order_seq
  OWNED BY help_contents.sort_order;

ALTER TABLE help_contents
  ALTER COLUMN sort_order SET DEFAULT nextval('help_content_sort_order_seq'),
  ALTER COLUMN sort_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS help_contents_order_idx
  ON help_contents (sort_order, title);
