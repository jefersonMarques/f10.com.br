-- Vínculo operacional explícito entre ticket e unidade comercial importada.
-- Não concede acesso ao portal e não altera a identidade da pessoa no ticket.
CREATE TABLE IF NOT EXISTS ticket_commercial_unit_links (
  ticket_id uuid PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  customer_unit_id uuid NOT NULL REFERENCES customer_units(id) ON DELETE RESTRICT,
  linked_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_commercial_unit_links_unit_idx
  ON ticket_commercial_unit_links(customer_unit_id);
