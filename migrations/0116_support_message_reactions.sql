-- Reações vinculadas à origem física da mensagem.
-- A autorização é validada no serviço antes de qualquer escrita.
CREATE TABLE IF NOT EXISTS support_message_reactions (
  source_kind text NOT NULL CHECK (source_kind IN ('chat','ticket')),
  message_id uuid NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind IN ('agent','customer')),
  actor_key text NOT NULL CHECK (length(actor_key) BETWEEN 1 AND 180),
  reaction text NOT NULL CHECK (reaction IN ('like','heart','check','eyes')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_kind, message_id, actor_kind, actor_key)
);
CREATE INDEX IF NOT EXISTS support_message_reactions_message_idx
  ON support_message_reactions (source_kind, message_id);