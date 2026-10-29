-- Os contratos pertencem à unidade configurada em F10_UID.
-- contrato_id identifica o registro; numero_contrato é a referência comercial.
CREATE TABLE IF NOT EXISTS f10_customer_contracts (
  unit_id integer NOT NULL CHECK (unit_id > 0),
  contract_id bigint NOT NULL CHECK (contract_id > 0),
  numero_contrato text,
  pessoa_id bigint,
  titular_id bigint,
  status integer,
  x_status text,
  curso_id bigint,
  fonte_id bigint,
  vendedor_id bigint,
  telemarketing_id bigint,
  matricula text,
  conclusao text,
  data_cancelamento text,
  source_record jsonb NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_batch_id uuid REFERENCES f10_customer_sync_batches(id) ON DELETE SET NULL,
  PRIMARY KEY (unit_id, contract_id)
);
CREATE INDEX IF NOT EXISTS f10_customer_contracts_number_idx
  ON f10_customer_contracts (unit_id, numero_contrato)
  WHERE numero_contrato IS NOT NULL;
CREATE INDEX IF NOT EXISTS f10_customer_contracts_person_idx
  ON f10_customer_contracts (unit_id, pessoa_id);
CREATE INDEX IF NOT EXISTS f10_customer_contracts_status_idx
  ON f10_customer_contracts (unit_id, status, x_status);
CREATE INDEX IF NOT EXISTS f10_customer_contracts_payload_idx
  ON f10_customer_contracts USING gin (source_record);

-- Exibe os números comerciais na prévia, sem repetir os dados dos contratos.
ALTER TABLE f10_customer_sync_rows
  ADD COLUMN IF NOT EXISTS contract_numbers jsonb NOT NULL DEFAULT '[]'::jsonb;
