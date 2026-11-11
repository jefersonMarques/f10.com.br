-- Dados do solicitante exibidos no ticket sem modificar acesso ao portal nem entrega de e-mails.
CREATE TABLE IF NOT EXISTS ticket_requester_profiles (
  ticket_id uuid PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  display_name text,
  display_email text,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_requester_profiles_contact_idx
  ON ticket_requester_profiles(customer_contact_id);
