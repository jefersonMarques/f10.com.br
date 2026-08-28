ALTER TABLE web_chat_sessions
  ADD COLUMN IF NOT EXISTS customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS queue_id uuid REFERENCES support_queues(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT 'Atendimento F10',
  ADD COLUMN IF NOT EXISTS legacy_user_id text,
  ADD COLUMN IF NOT EXISTS group_id integer,
  ADD COLUMN IF NOT EXISTS group_name text,
  ADD COLUMN IF NOT EXISTS unit_id integer,
  ADD COLUMN IF NOT EXISTS unit_name text,
  ADD COLUMN IF NOT EXISTS unit_schema text,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE web_chat_sessions AS chat
SET
  customer_contact_id = COALESCE(chat.customer_contact_id, ticket.customer_contact_id),
  queue_id = COALESCE(chat.queue_id, ticket.queue_id),
  assigned_user_id = COALESCE(chat.assigned_user_id, ticket.assigned_user_id),
  subject = CASE
    WHEN chat.subject = 'Atendimento F10' THEN ticket.subject
    ELSE chat.subject
  END,
  first_response_at = COALESCE(chat.first_response_at, ticket.first_response_at),
  updated_at = GREATEST(chat.updated_at, ticket.updated_at)
FROM tickets AS ticket
WHERE chat.ticket_id = ticket.id;

UPDATE web_chat_sessions AS chat
SET
  legacy_user_id = COALESCE(chat.legacy_user_id, context.legacy_user_id),
  group_id = COALESCE(chat.group_id, context.group_id),
  group_name = COALESCE(chat.group_name, context.group_name),
  unit_id = COALESCE(chat.unit_id, context.unit_id),
  unit_name = COALESCE(chat.unit_name, context.unit_name),
  unit_schema = COALESCE(chat.unit_schema, context.unit_schema)
FROM ticket_customer_contexts AS context
WHERE chat.ticket_id = context.ticket_id
  AND context.context_scope = 'unit';

ALTER TABLE web_chat_sessions
  ALTER COLUMN queue_id SET NOT NULL,
  ALTER COLUMN ticket_id DROP NOT NULL;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT constraint.conname
    INTO constraint_name
  FROM pg_constraint AS constraint
  JOIN pg_attribute AS attribute
    ON attribute.attrelid = constraint.conrelid
   AND attribute.attnum = ANY(constraint.conkey)
  WHERE constraint.conrelid = 'web_chat_sessions'::regclass
    AND constraint.contype = 'f'
    AND attribute.attname = 'ticket_id'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE web_chat_sessions DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'web_chat_sessions_ticket_id_fkey'
      AND conrelid = 'web_chat_sessions'::regclass
  ) THEN
    ALTER TABLE web_chat_sessions
      ADD CONSTRAINT web_chat_sessions_ticket_id_fkey
      FOREIGN KEY (ticket_id)
      REFERENCES tickets(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS web_chat_sessions_queue_idx
  ON web_chat_sessions(queue_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS web_chat_sessions_assigned_idx
  ON web_chat_sessions(assigned_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS web_chat_sessions_customer_idx
  ON web_chat_sessions(customer_contact_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS web_chat_sessions_legacy_context_idx
  ON web_chat_sessions(legacy_user_id, group_id, unit_id);

CREATE TABLE IF NOT EXISTS web_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES web_chat_sessions(id) ON DELETE CASCADE,
  author_type ticket_message_author_type NOT NULL,
  author_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_chat_messages_session_idx
  ON web_chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS web_chat_messages_author_user_idx
  ON web_chat_messages(author_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS web_chat_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES web_chat_messages(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES web_chat_sessions(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  checksum_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS web_chat_message_attachments_storage_key_unique
  ON web_chat_message_attachments(storage_key);
CREATE INDEX IF NOT EXISTS web_chat_message_attachments_message_idx
  ON web_chat_message_attachments(message_id, created_at);
CREATE INDEX IF NOT EXISTS web_chat_message_attachments_session_idx
  ON web_chat_message_attachments(session_id, created_at);

-- Mantém atendimentos existentes íntegros e cria uma cópia própria do histórico do chat.
INSERT INTO web_chat_messages (
  id,
  session_id,
  author_type,
  author_user_id,
  customer_contact_id,
  body,
  created_at
)
SELECT
  message.id,
  chat.id,
  message.author_type,
  message.author_user_id,
  message.customer_contact_id,
  message.body,
  message.created_at
FROM web_chat_sessions AS chat
JOIN ticket_messages AS message
  ON message.ticket_id = chat.ticket_id
 AND message.visibility = 'public'
ON CONFLICT (id) DO NOTHING;

INSERT INTO web_chat_message_attachments (
  id,
  message_id,
  session_id,
  storage_key,
  original_name,
  mime_type,
  size_bytes,
  checksum_sha256,
  created_at
)
SELECT
  attachment.id,
  attachment.message_id,
  message.session_id,
  attachment.storage_key,
  attachment.original_name,
  attachment.mime_type,
  attachment.size_bytes,
  attachment.checksum_sha256,
  attachment.created_at
FROM ticket_message_attachments AS attachment
JOIN web_chat_messages AS message
  ON message.id = attachment.message_id
ON CONFLICT (id) DO NOTHING;
