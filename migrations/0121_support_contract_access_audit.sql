-- Registra concessões explícitas de acesso contratual no suporte.
CREATE TABLE IF NOT EXISTS customer_contract_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_contact_id uuid NOT NULL REFERENCES customer_contacts(id) ON DELETE RESTRICT,
  unit_id integer NOT NULL,
  contract_id bigint NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('granted')),
  source text NOT NULL CHECK (source IN ('ticket_creation')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (unit_id, contract_id)
    REFERENCES f10_customer_contracts(unit_id, contract_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS customer_contract_access_events_contact_idx
  ON customer_contract_access_events(customer_contact_id, created_at DESC);
