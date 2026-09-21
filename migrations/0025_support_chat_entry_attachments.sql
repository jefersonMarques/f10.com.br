CREATE TABLE IF NOT EXISTS support_chat_entry_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  queue_id uuid NOT NULL REFERENCES support_queues(id) ON DELETE RESTRICT,
  initial_handling text NOT NULL DEFAULT 'ai'
    CHECK (initial_handling IN ('ai', 'human')),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_chat_entry_options_active_order_idx
  ON support_chat_entry_options(active, sort_order, created_at);

CREATE INDEX IF NOT EXISTS support_chat_entry_options_queue_idx
  ON support_chat_entry_options(queue_id);

CREATE TABLE IF NOT EXISTS ticket_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES ticket_messages(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  checksum_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_message_attachments_message_idx
  ON ticket_message_attachments(message_id, created_at);

CREATE INDEX IF NOT EXISTS ticket_message_attachments_ticket_idx
  ON ticket_message_attachments(ticket_id, created_at);

INSERT INTO support_chat_entry_options (
  label,
  description,
  queue_id,
  initial_handling,
  active,
  sort_order
)
SELECT
  'Preciso de suporte técnico',
  'Problemas ou dúvidas no sistema',
  id,
  'ai',
  true,
  10
FROM support_queues
WHERE code = 'support'
  AND NOT EXISTS (
    SELECT 1
    FROM support_chat_entry_options
    WHERE label = 'Preciso de suporte técnico'
  )
LIMIT 1;
