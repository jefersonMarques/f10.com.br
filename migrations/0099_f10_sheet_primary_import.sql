-- A planilha é a fonte do cadastro comercial. A API apenas complementa os vínculos.
ALTER TABLE customer_units
  ADD COLUMN IF NOT EXISTS apelido text,
  ADD COLUMN IF NOT EXISTS f10_unit_id integer,
  ADD COLUMN IF NOT EXISTS f10_contract_id bigint,
  ADD COLUMN IF NOT EXISTS f10_person_id bigint,
  ADD COLUMN IF NOT EXISTS f10_holder_id bigint;

CREATE INDEX IF NOT EXISTS customer_units_f10_person_idx
  ON customer_units (f10_unit_id, f10_person_id)
  WHERE f10_person_id IS NOT NULL;

-- Identidade de importação opcional; contatos já existentes não são alterados.
ALTER TABLE customer_contacts
  ADD COLUMN IF NOT EXISTS import_source text,
  ADD COLUMN IF NOT EXISTS import_source_id text;

CREATE UNIQUE INDEX IF NOT EXISTS customer_contacts_import_identity_idx
  ON customer_contacts (import_source, import_source_id)
  WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL;
