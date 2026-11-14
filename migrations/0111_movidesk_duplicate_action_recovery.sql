-- Preserva ocorrências históricas que compartilham o mesmo ID de ação no Movidesk.
CREATE TABLE IF NOT EXISTS movidesk_ticket_action_occurrences (
  source_ticket_id text NOT NULL REFERENCES movidesk_ticket_imports(source_ticket_id) ON DELETE RESTRICT,
  source_action_id integer NOT NULL,
  occurrence_index integer NOT NULL CHECK (occurrence_index > 0),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  source_action_json text NOT NULL,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  recovered_message_id uuid UNIQUE REFERENCES ticket_messages(id) ON DELETE RESTRICT,
  needs_chat_review boolean NOT NULL DEFAULT false,
  recovered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_ticket_id, source_action_id, occurrence_index)
);

CREATE INDEX IF NOT EXISTS movidesk_ticket_action_occurrences_ticket_idx
  ON movidesk_ticket_action_occurrences(ticket_id);
