-- Identidade comercial vinculada a um contrato da unidade configurada em F10_UID.
-- A API fornece contratos/pessoas; a planilha complementa apelido e franquia.
-- Razão social permanece vazia até que exista uma fonte jurídica verificada.
CREATE TABLE IF NOT EXISTS f10_customer_contract_profiles (
  unit_id integer NOT NULL,
  contract_id bigint NOT NULL,
  apelido text,
  razao_social text,
  group_id uuid REFERENCES customer_groups(id) ON DELETE SET NULL,
  customer_unit_id uuid REFERENCES customer_units(id) ON DELETE SET NULL,
  spreadsheet_student_name text,
  spreadsheet_holder_name text,
  commercial_status text,
  contracted_plan text,
  city text,
  account_executive text,
  source_file_hash text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (unit_id, contract_id),
  FOREIGN KEY (unit_id, contract_id)
    REFERENCES f10_customer_contracts(unit_id, contract_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS f10_customer_contract_profiles_group_idx
  ON f10_customer_contract_profiles (group_id);
CREATE INDEX IF NOT EXISTS f10_customer_contract_profiles_apelido_idx
  ON f10_customer_contract_profiles (unit_id, lower(apelido));

-- Arquivo complementar com prévia auditável. Nada de emails ou links financeiros nesta tabela.
CREATE TABLE IF NOT EXISTS f10_customer_sheet_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id integer NOT NULL CHECK (unit_id > 0),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  status text NOT NULL DEFAULT 'review' CHECK (status IN ('review', 'applied')),
  total_rows integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);
CREATE INDEX IF NOT EXISTS f10_customer_sheet_batches_created_idx
  ON f10_customer_sheet_batches (unit_id, created_at DESC);

CREATE TABLE IF NOT EXISTS f10_customer_sheet_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES f10_customer_sheet_batches(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  source_id text NOT NULL,
  record jsonb NOT NULL,
  contract_id bigint,
  match_status text NOT NULL DEFAULT 'pending'
    CHECK (match_status IN ('pending', 'matched', 'not_found', 'ambiguous')),
  applied_at timestamptz,
  UNIQUE (batch_id, line_number)
);
CREATE INDEX IF NOT EXISTS f10_customer_sheet_rows_batch_idx
  ON f10_customer_sheet_rows (batch_id, match_status, line_number);
