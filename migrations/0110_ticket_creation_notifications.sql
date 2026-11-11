-- Controle idempotente das confirmações de tickets criados fora do recebimento de e-mail.
CREATE TABLE IF NOT EXISTS ticket_creation_notifications (
  ticket_id uuid PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  status text NOT NULL CHECK (status IN ('sending', 'sent', 'failed', 'skipped')),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_code text
);
