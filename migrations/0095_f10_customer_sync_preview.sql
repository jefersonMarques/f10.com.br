-- Esta etapa prepara diagnósticos e vínculos, mas não grava contatos de clientes.
CREATE TABLE IF NOT EXISTS f10_customer_external_identities (
  unit_id integer NOT NULL CHECK (unit_id = 1),
  person_id bigint NOT NULL CHECK (person_id > 0),
  customer_contact_id uuid NOT NULL REFERENCES customer_contacts(id) ON DELETE RESTRICT,
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  PRIMARY KEY (unit_id, person_id),
  UNIQUE (unit_id, customer_contact_id)
);

CREATE TABLE IF NOT EXISTS f10_customer_sync_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'scanning', 'review', 'failed')),
  total_contracts integer NOT NULL DEFAULT 0,
  skipped_contracts integer NOT NULL DEFAULT 0,
  total_people integer NOT NULL DEFAULT 0,
  processed_people integer NOT NULL DEFAULT 0,
  last_error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS f10_customer_sync_one_running_idx
  ON f10_customer_sync_batches ((1)) WHERE status IN ('queued', 'scanning');
CREATE INDEX IF NOT EXISTS f10_customer_sync_batches_created_idx
  ON f10_customer_sync_batches (created_at DESC);

CREATE TABLE IF NOT EXISTS f10_customer_sync_rows (
  batch_id uuid NOT NULL REFERENCES f10_customer_sync_batches(id) ON DELETE CASCADE,
  person_id bigint NOT NULL CHECK (person_id > 0),
  contract_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  active_contracts integer NOT NULL DEFAULT 0,
  customer_name text,
  email text,
  phone text,
  whatsapp text,
  result text NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pending','create','update','unchanged','possible_match','failed')),
  matched_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  potential_match_count integer NOT NULL DEFAULT 0,
  error_code text,
  checked_at timestamptz,
  PRIMARY KEY (batch_id, person_id)
);
CREATE INDEX IF NOT EXISTS f10_customer_sync_rows_pending_idx
  ON f10_customer_sync_rows (batch_id, person_id) WHERE result = 'pending';
