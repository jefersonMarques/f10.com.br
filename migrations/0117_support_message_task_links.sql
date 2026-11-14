-- Vínculo persistente entre mensagem e tarefa, independentemente da abertura de ticket.
-- A chave da solicitação evita duplicação em envios repetidos.
CREATE TABLE IF NOT EXISTS support_message_task_links (
  source_kind text NOT NULL CHECK (source_kind IN ('chat', 'ticket')),
  message_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  request_key uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_kind, message_id, task_id)
);

CREATE INDEX IF NOT EXISTS support_message_task_links_message_idx
  ON support_message_task_links (source_kind, message_id);

CREATE INDEX IF NOT EXISTS support_message_task_links_task_idx
  ON support_message_task_links (task_id);
