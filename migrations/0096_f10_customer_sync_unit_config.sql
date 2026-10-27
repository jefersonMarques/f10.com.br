-- O histórico de diagnósticos mantém a unidade usada em cada execução.
ALTER TABLE f10_customer_sync_batches
  ADD COLUMN IF NOT EXISTS unit_id integer NOT NULL DEFAULT 1;
ALTER TABLE f10_customer_sync_batches
  ALTER COLUMN unit_id DROP DEFAULT;
ALTER TABLE f10_customer_sync_batches
  ADD CONSTRAINT f10_customer_sync_batches_unit_positive CHECK (unit_id > 0);

-- O identificador externo tem chave composta (unit_id, person_id).
ALTER TABLE f10_customer_external_identities
  DROP CONSTRAINT IF EXISTS f10_customer_external_identities_unit_id_check;
ALTER TABLE f10_customer_external_identities
  ADD CONSTRAINT f10_customer_external_identities_unit_positive CHECK (unit_id > 0);
