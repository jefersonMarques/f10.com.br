-- Cópia imutável das transcrições recebidas antes da divisão em mensagens.
CREATE TABLE IF NOT EXISTS movidesk_chat_transcript_archives (
  source_ticket_id text PRIMARY KEY REFERENCES movidesk_ticket_imports(source_ticket_id),
  source_action_id integer NOT NULL,
  original_message_id uuid NOT NULL UNIQUE REFERENCES ticket_messages(id) ON DELETE RESTRICT,
  chat_session_id uuid UNIQUE REFERENCES web_chat_sessions(id) ON DELETE RESTRICT,
  original_body text NOT NULL,
  original_sha256 text NOT NULL,
  parsed_message_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
