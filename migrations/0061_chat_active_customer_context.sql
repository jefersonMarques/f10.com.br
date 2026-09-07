UPDATE web_chat_sessions
SET
  closed_at = COALESCE(closed_at, expires_at),
  updated_at = NOW()
WHERE closed_at IS NULL
  AND expires_at <= NOW();

WITH ranked_sessions AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY legacy_user_id, group_id, unit_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS position
  FROM web_chat_sessions
  WHERE closed_at IS NULL
    AND legacy_user_id IS NOT NULL
    AND group_id IS NOT NULL
    AND unit_id IS NOT NULL
)
UPDATE web_chat_sessions AS session
SET
  closed_at = NOW(),
  updated_at = NOW()
FROM ranked_sessions
WHERE session.id = ranked_sessions.id
  AND ranked_sessions.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS web_chat_sessions_active_customer_context_unique
  ON web_chat_sessions (legacy_user_id, group_id, unit_id)
  WHERE closed_at IS NULL
    AND legacy_user_id IS NOT NULL
    AND group_id IS NOT NULL
    AND unit_id IS NOT NULL;
