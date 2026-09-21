ALTER TABLE ticket_customer_contexts
  ADD COLUMN IF NOT EXISTS context_scope text NOT NULL DEFAULT 'unit';

ALTER TABLE ticket_customer_contexts
  ALTER COLUMN group_id DROP NOT NULL,
  ALTER COLUMN group_name DROP NOT NULL,
  ALTER COLUMN unit_id DROP NOT NULL,
  ALTER COLUMN unit_name DROP NOT NULL,
  ALTER COLUMN unit_schema DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ticket_customer_contexts_scope_check'
      AND conrelid = 'ticket_customer_contexts'::regclass
  ) THEN
    ALTER TABLE ticket_customer_contexts
      ADD CONSTRAINT ticket_customer_contexts_scope_check CHECK (
        (
          context_scope = 'unit'
          AND group_id IS NOT NULL
          AND group_name IS NOT NULL
          AND unit_id IS NOT NULL
          AND unit_name IS NOT NULL
          AND unit_schema IS NOT NULL
        )
        OR
        (
          context_scope = 'global'
          AND group_id IS NULL
          AND group_name IS NULL
          AND unit_id IS NULL
          AND unit_name IS NULL
          AND unit_schema IS NULL
        )
      );
  END IF;
END $$;
