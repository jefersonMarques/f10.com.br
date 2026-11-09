-- Identidade estável e trilha de origem para a migração controlada dos tickets abertos.
CREATE TABLE IF NOT EXISTS movidesk_ticket_imports (
  source_ticket_id text PRIMARY KEY,
  ticket_id uuid NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE RESTRICT,
  source_status text NOT NULL,
  source_base_status text NOT NULL,
  source_protocol text,
  source_last_update timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movidesk_ticket_action_imports (
  source_ticket_id text NOT NULL REFERENCES movidesk_ticket_imports(source_ticket_id) ON DELETE CASCADE,
  source_action_id integer NOT NULL,
  message_id uuid NOT NULL UNIQUE REFERENCES ticket_messages(id) ON DELETE RESTRICT,
  source_visibility text NOT NULL,
  PRIMARY KEY (source_ticket_id, source_action_id)
);

CREATE INDEX IF NOT EXISTS movidesk_ticket_imports_ticket_idx
  ON movidesk_ticket_imports(ticket_id);
