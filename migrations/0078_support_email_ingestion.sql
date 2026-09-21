DO $$ BEGIN
  CREATE TYPE support_email_inbound_status AS ENUM (
    'pending',
    'processing',
    'retry_waiting',
    'processed',
    'ignored',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE ticket_messages
  ADD COLUMN IF NOT EXISTS external_message_id text,
  ADD COLUMN IF NOT EXISTS external_thread_id text,
  ADD COLUMN IF NOT EXISTS external_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS ticket_messages_email_external_message_unique
  ON ticket_messages (external_message_id)
  WHERE channel = 'email' AND external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ticket_messages_external_thread_idx
  ON ticket_messages (external_thread_id, created_at)
  WHERE external_thread_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS support_email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'brevo',
  conversation_id text NOT NULL,
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  inbox_code text NOT NULL,
  sender_name text,
  sender_email text NOT NULL,
  recipient_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS support_email_threads_provider_conversation_unique
  ON support_email_threads (provider, conversation_id);

CREATE UNIQUE INDEX IF NOT EXISTS support_email_threads_ticket_unique
  ON support_email_threads (ticket_id);

CREATE INDEX IF NOT EXISTS support_email_threads_sender_idx
  ON support_email_threads (lower(sender_email), updated_at DESC);

CREATE TABLE IF NOT EXISTS support_email_inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'brevo',
  event_type text NOT NULL,
  conversation_id text,
  provider_message_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  payload_hash text NOT NULL,
  raw_payload jsonb NOT NULL,
  status support_email_inbound_status NOT NULL DEFAULT 'pending',
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  lease_expires_at timestamptz,
  last_error_code text,
  last_error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_email_inbound_events_attempts_check CHECK (
    attempt_count >= 0 AND max_attempts BETWEEN 1 AND 20
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS support_email_inbound_events_provider_payload_unique
  ON support_email_inbound_events (provider, payload_hash);

CREATE INDEX IF NOT EXISTS support_email_inbound_events_queue_idx
  ON support_email_inbound_events (status, available_at, received_at);

CREATE INDEX IF NOT EXISTS support_email_inbound_events_conversation_idx
  ON support_email_inbound_events (provider, conversation_id, received_at DESC);

INSERT INTO support_queues (code, name, default_due_days, active)
VALUES
  ('financeiro', 'Financeiro', 3, true),
  ('sucesso', 'Sucesso do Cliente', 3, true)
ON CONFLICT (code) DO NOTHING;
