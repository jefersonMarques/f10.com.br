-- Participantes associados ao ticket, sem conceder automaticamente acesso ou notificações.
CREATE TABLE IF NOT EXISTS ticket_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  participant_type text NOT NULL CHECK (participant_type IN ('customer', 'operator')),
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  source_system text,
  source_person_id text,
  added_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  added_by_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  portal_access_enabled boolean NOT NULL DEFAULT false,
  notifications_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_participants_identity_check CHECK (
    (participant_type = 'customer' AND customer_contact_id IS NOT NULL AND user_id IS NULL)
    OR (participant_type = 'operator' AND user_id IS NOT NULL AND customer_contact_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_participants_customer_unique
  ON ticket_participants(ticket_id, customer_contact_id)
  WHERE customer_contact_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ticket_participants_operator_unique
  ON ticket_participants(ticket_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ticket_participants_customer_idx
  ON ticket_participants(customer_contact_id, ticket_id);

CREATE INDEX IF NOT EXISTS ticket_participants_user_idx
  ON ticket_participants(user_id, ticket_id);
