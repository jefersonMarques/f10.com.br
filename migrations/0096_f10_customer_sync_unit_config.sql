-- O histórico de diagnósticos mantém a unidade usada em cada execução.
ALTER TABLE f10_customer_sync_batches
  ADD COLUMN IF NOT EXISTS unit_id integer NOT NULL DEFAULT 1;
ALTER TABLE f10_customer_sync_batches
  ALTER COLUMN unit_id DROP DEFAULT;
ALTER TABLE f10_customer_sync_batches
  ADD CONSTRAINT f10_customer_sync_batches_unit_positive CHECK (unit_id > 0);
