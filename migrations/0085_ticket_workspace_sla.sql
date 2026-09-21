ALTER TABLE roles
ADD COLUMN IF NOT EXISTS restrict_ticket_areas boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS role_ticket_areas (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES ticket_areas(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, area_id)
);

CREATE INDEX IF NOT EXISTS role_ticket_areas_area_idx
ON role_ticket_areas(area_id, role_id);

CREATE TABLE IF NOT EXISTS ticket_followers (
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS ticket_followers_user_idx
ON ticket_followers(user_id, created_at);

ALTER TABLE support_queues
ADD COLUMN IF NOT EXISTS sla_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sla_first_response_minutes integer NOT NULL DEFAULT 240,
ADD COLUMN IF NOT EXISTS sla_next_response_minutes integer NOT NULL DEFAULT 480,
ADD COLUMN IF NOT EXISTS sla_resolution_minutes integer NOT NULL DEFAULT 4320;

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS next_response_due_at timestamptz;

CREATE INDEX IF NOT EXISTS tickets_first_response_due_idx
ON tickets(first_response_due_at)
WHERE first_response_at IS NULL AND status NOT IN ('resolved', 'closed');

CREATE INDEX IF NOT EXISTS tickets_next_response_due_idx
ON tickets(next_response_due_at)
WHERE next_response_due_at IS NOT NULL AND status NOT IN ('resolved', 'closed');

CREATE INDEX IF NOT EXISTS tickets_resolution_due_idx
ON tickets(resolution_due_at)
WHERE resolution_due_at IS NOT NULL AND status NOT IN ('resolved', 'closed');

INSERT INTO permissions (code, name, description)
VALUES (
  'tickets.comment_internal',
  'Comentar internamente em tickets',
  'Permite adicionar notas internas sem responder o cliente ou operar o fluxo do ticket.'
)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_code, scope)
SELECT roles.id, 'tickets.comment_internal', 'all'::permission_scope
FROM roles
WHERE roles.code = 'ADMIN'
ON CONFLICT (role_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;

INSERT INTO role_permissions (role_id, permission_code, scope)
SELECT roles.id, 'tickets.comment_internal', 'team'::permission_scope
FROM roles
WHERE roles.code = 'EMPLOYEE'
ON CONFLICT (role_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;
