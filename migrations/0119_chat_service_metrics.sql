-- Registros explícitos para métricas de atendimento humano, sem modificar mensagens.
ALTER TABLE web_chat_sessions
  ADD COLUMN IF NOT EXISTS human_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS close_reason text,
  ADD COLUMN IF NOT EXISTS closed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE web_chat_sessions
    ADD CONSTRAINT web_chat_sessions_close_reason_check
    CHECK (close_reason IN ('customer', 'agent', 'expired'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- As conversas existentes que já foram encaminhadas a um humano têm um marco de entrada confiável.
UPDATE web_chat_sessions
SET human_requested_at = created_at
WHERE human_requested_at IS NULL
  AND context_data->>'assistantHandoff' = 'true';

CREATE INDEX IF NOT EXISTS web_chat_sessions_created_report_idx
  ON web_chat_sessions (created_at DESC);

CREATE INDEX IF NOT EXISTS web_chat_sessions_waiting_report_idx
  ON web_chat_sessions (human_requested_at, queue_id)
  WHERE closed_at IS NULL AND first_response_at IS NULL;

CREATE TABLE IF NOT EXISTS support_chat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES web_chat_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN ('human_requested', 'assigned', 'transferred', 'first_response', 'closed', 'expired')
  ),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_chat_events_session_idx
  ON support_chat_events (session_id, occurred_at);

CREATE INDEX IF NOT EXISTS support_chat_events_actor_idx
  ON support_chat_events (actor_user_id, occurred_at);
