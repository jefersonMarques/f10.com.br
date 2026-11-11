-- Reserva a confirmação para tickets recém-abertos por e-mail, sem duplicar o envio.
CREATE TABLE IF NOT EXISTS support_email_ticket_receipts (
  ticket_id uuid PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  initial_message_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempted_at timestamptz,
  sent_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
