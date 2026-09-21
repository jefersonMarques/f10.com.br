CREATE TABLE IF NOT EXISTS ticket_satisfaction_surveys (
  ticket_id uuid PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  customer_contact_id uuid NOT NULL REFERENCES customer_contacts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  score integer,
  comment text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  answered_at timestamptz,
  CONSTRAINT ticket_satisfaction_score_check CHECK (score IS NULL OR score BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS ticket_satisfaction_customer_idx
  ON ticket_satisfaction_surveys(customer_contact_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS ticket_satisfaction_pending_idx
  ON ticket_satisfaction_surveys(expires_at)
  WHERE answered_at IS NULL;
