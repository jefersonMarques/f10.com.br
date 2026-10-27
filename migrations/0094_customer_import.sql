-- Cadastro comercial separado das identidades de autenticação e dos tickets.
CREATE TABLE IF NOT EXISTS customer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  source_group_id text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_system, source_group_id)
);

CREATE TABLE IF NOT EXISTS customer_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES customer_groups(id),
  organization_id uuid NOT NULL REFERENCES customer_organizations(id),
  source_system text NOT NULL,
  source_id text NOT NULL,
  name text NOT NULL,
  commercial_status text NOT NULL,
  contracted_plan text,
  city text,
  account_executive text,
  cancellation_reason text,
  cancellation_date text,
  billing_access_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_system, source_id)
);
CREATE INDEX IF NOT EXISTS customer_units_group_idx ON customer_units (group_id);
CREATE INDEX IF NOT EXISTS customer_units_organization_idx ON customer_units (organization_id);

-- Dados de contato comerciais não concedem acesso ao portal.
CREATE TABLE IF NOT EXISTS customer_unit_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES customer_units(id) ON DELETE CASCADE,
  contact_kind text NOT NULL,
  name text,
  email text,
  phone text,
  mobile text,
  commercial_phone text,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  UNIQUE (unit_id, contact_kind)
);

CREATE TABLE IF NOT EXISTS customer_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  status text NOT NULL DEFAULT 'review',
  total_rows integer NOT NULL,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_import_batches_created_idx ON customer_import_batches (created_at DESC);

CREATE TABLE IF NOT EXISTS customer_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES customer_import_batches(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  source_id text NOT NULL,
  source_group_id text,
  record jsonb NOT NULL,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision text NOT NULL DEFAULT 'review',
  target_organization_id uuid REFERENCES customer_organizations(id) ON DELETE RESTRICT,
  applied_at timestamptz,
  error_code text,
  UNIQUE (batch_id, line_number)
);
CREATE INDEX IF NOT EXISTS customer_import_rows_pending_idx
  ON customer_import_rows (batch_id, decision, line_number)
  WHERE applied_at IS NULL;

CREATE TABLE IF NOT EXISTS customer_import_events (
  id bigserial PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES customer_import_batches(id) ON DELETE CASCADE,
  row_id uuid REFERENCES customer_import_rows(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_import_events_batch_idx ON customer_import_events (batch_id, created_at);
