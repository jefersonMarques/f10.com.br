CREATE TABLE IF NOT EXISTS support_agent_presence (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  manual_status text NOT NULL DEFAULT 'offline'
    CHECK (manual_status IN ('online', 'busy', 'offline')),
  last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_agent_presence_activity_idx
  ON support_agent_presence(manual_status, last_activity_at);

CREATE TABLE IF NOT EXISTS support_chat_routing_members (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  last_assigned_at timestamptz,
  added_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_chat_routing_members_enabled_idx
  ON support_chat_routing_members(enabled, last_assigned_at);

CREATE TABLE IF NOT EXISTS ticket_task_links (
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, task_id)
);

CREATE INDEX IF NOT EXISTS ticket_task_links_ticket_idx
  ON ticket_task_links(ticket_id, created_at);

CREATE INDEX IF NOT EXISTS ticket_task_links_task_idx
  ON ticket_task_links(task_id, created_at);

INSERT INTO ticket_task_links (ticket_id, task_id, created_at)
SELECT id, linked_task_id, updated_at
FROM tickets
WHERE linked_task_id IS NOT NULL
ON CONFLICT DO NOTHING;
