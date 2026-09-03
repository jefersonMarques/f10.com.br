CREATE TABLE IF NOT EXISTS support_ticket_routing_members (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  last_assigned_at timestamptz,
  added_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_ticket_routing_members_enabled_idx
  ON support_ticket_routing_members(enabled, last_assigned_at);

-- Preserva o comportamento anterior após o deploy. A elegibilidade de tickets
-- continua sendo validada por tickets.reply em runtime.
INSERT INTO support_ticket_routing_members (
  user_id,
  enabled,
  last_assigned_at,
  added_by,
  created_at,
  updated_at
)
SELECT
  user_id,
  enabled,
  NULL,
  added_by,
  created_at,
  updated_at
FROM support_chat_routing_members
ON CONFLICT (user_id) DO NOTHING;
