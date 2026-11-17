-- Mantém os números anteriores dos tickets para consultas e auditoria.
CREATE TABLE IF NOT EXISTS ticket_number_aliases (
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  previous_number bigint NOT NULL CHECK (previous_number > 0),
  alias_source text NOT NULL CHECK (alias_source = 'f10_before_migration'),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, previous_number)
);

CREATE INDEX IF NOT EXISTS ticket_number_aliases_lookup_idx
  ON ticket_number_aliases (previous_number, ticket_id);

-- Impede repetir uma migração de numeração após novos tickets serem criados.
CREATE TABLE IF NOT EXISTS ticket_number_reconciliation_runs (
  operation_key text PRIMARY KEY,
  plan_hash text NOT NULL,
  tickets_processed integer NOT NULL CHECK (tickets_processed > 0),
  numbers_changed integer NOT NULL CHECK (numbers_changed > 0),
  applied_at timestamptz NOT NULL DEFAULT now()
);
