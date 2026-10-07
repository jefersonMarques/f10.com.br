ALTER TABLE support_email_threads
  ADD COLUMN IF NOT EXISTS reply_token text;

CREATE UNIQUE INDEX IF NOT EXISTS support_email_threads_reply_token_unique
  ON support_email_threads(reply_token)
  WHERE reply_token IS NOT NULL;
