ALTER TABLE web_chat_messages
  ADD COLUMN IF NOT EXISTS visibility support_message_visibility NOT NULL DEFAULT 'public';

CREATE INDEX IF NOT EXISTS web_chat_messages_session_visibility_idx
  ON web_chat_messages(session_id, visibility, created_at);
