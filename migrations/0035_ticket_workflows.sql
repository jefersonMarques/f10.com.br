DO $$ BEGIN
  CREATE TYPE ticket_workflow_kind AS ENUM ('global', 'area');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_workflow_stage_type AS ENUM ('normal', 'area_gateway', 'terminal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_workflow_transition_type AS ENUM ('global_move', 'area_move', 'handoff');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ticket_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind ticket_workflow_kind NOT NULL,
  queue_id uuid REFERENCES support_queues(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_workflows_area_queue_check CHECK (
    (kind = 'area' AND queue_id IS NOT NULL) OR
    (kind = 'global' AND queue_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_workflows_active_global_unique
  ON ticket_workflows ((kind))
  WHERE active = true AND kind = 'global';

CREATE UNIQUE INDEX IF NOT EXISTS ticket_workflows_active_area_queue_unique
  ON ticket_workflows (queue_id)
  WHERE active = true AND kind = 'area';

CREATE INDEX IF NOT EXISTS ticket_workflows_kind_idx
  ON ticket_workflows (kind, active, updated_at DESC);

CREATE TABLE IF NOT EXISTS ticket_workflow_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES ticket_workflows(id) ON DELETE RESTRICT,
  code text,
  name text NOT NULL,
  stage_type ticket_workflow_stage_type NOT NULL DEFAULT 'normal',
  linked_queue_id uuid REFERENCES support_queues(id) ON DELETE RESTRICT,
  lifecycle_status ticket_status NOT NULL DEFAULT 'open',
  is_initial boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_workflow_stages_gateway_queue_check CHECK (
    stage_type <> 'area_gateway' OR linked_queue_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_workflow_stages_code_unique
  ON ticket_workflow_stages (workflow_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_workflow_stages_initial_unique
  ON ticket_workflow_stages (workflow_id)
  WHERE active = true AND is_initial = true;

CREATE INDEX IF NOT EXISTS ticket_workflow_stages_workflow_idx
  ON ticket_workflow_stages (workflow_id, active, sort_order);

CREATE INDEX IF NOT EXISTS ticket_workflow_stages_queue_idx
  ON ticket_workflow_stages (linked_queue_id, active);

CREATE TABLE IF NOT EXISTS ticket_workflow_states (
  ticket_id uuid PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  global_workflow_id uuid NOT NULL REFERENCES ticket_workflows(id) ON DELETE RESTRICT,
  global_stage_id uuid NOT NULL REFERENCES ticket_workflow_stages(id) ON DELETE RESTRICT,
  area_workflow_id uuid REFERENCES ticket_workflows(id) ON DELETE RESTRICT,
  area_stage_id uuid REFERENCES ticket_workflow_stages(id) ON DELETE RESTRICT,
  entered_at timestamptz NOT NULL DEFAULT now(),
  area_entered_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_workflow_states_area_pair_check CHECK (
    (area_workflow_id IS NULL AND area_stage_id IS NULL) OR
    (area_workflow_id IS NOT NULL AND area_stage_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ticket_workflow_states_global_idx
  ON ticket_workflow_states (global_stage_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS ticket_workflow_states_area_idx
  ON ticket_workflow_states (area_workflow_id, area_stage_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ticket_workflow_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  transition_type ticket_workflow_transition_type NOT NULL,
  from_workflow_id uuid REFERENCES ticket_workflows(id) ON DELETE SET NULL,
  to_workflow_id uuid REFERENCES ticket_workflows(id) ON DELETE SET NULL,
  from_stage_id uuid REFERENCES ticket_workflow_stages(id) ON DELETE SET NULL,
  to_stage_id uuid REFERENCES ticket_workflow_stages(id) ON DELETE SET NULL,
  from_queue_id uuid REFERENCES support_queues(id) ON DELETE SET NULL,
  to_queue_id uuid REFERENCES support_queues(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_workflow_history_ticket_idx
  ON ticket_workflow_history (ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ticket_workflow_history_queue_idx
  ON ticket_workflow_history (to_queue_id, created_at DESC);

INSERT INTO ticket_workflows (name, kind)
SELECT 'Fluxo global de tickets', 'global'::ticket_workflow_kind
WHERE NOT EXISTS (
  SELECT 1 FROM ticket_workflows WHERE kind = 'global' AND active = true
);

WITH global_workflow AS (
  SELECT id
  FROM ticket_workflows
  WHERE kind = 'global' AND active = true
  ORDER BY created_at ASC
  LIMIT 1
), stage_data(code, name, stage_type, lifecycle_status, is_initial, sort_order) AS (
  VALUES
    ('legacy:new', 'Novo', 'normal'::ticket_workflow_stage_type, 'new'::ticket_status, true, 100),
    ('legacy:open', 'Aberto', 'normal'::ticket_workflow_stage_type, 'open'::ticket_status, false, 200),
    ('legacy:in_progress', 'Em andamento', 'normal'::ticket_workflow_stage_type, 'in_progress'::ticket_status, false, 300),
    ('legacy:waiting_customer', 'Aguardando cliente', 'normal'::ticket_workflow_stage_type, 'waiting_customer'::ticket_status, false, 400),
    ('legacy:resolved', 'Resolvido', 'terminal'::ticket_workflow_stage_type, 'resolved'::ticket_status, false, 500),
    ('legacy:closed', 'Fechado', 'terminal'::ticket_workflow_stage_type, 'closed'::ticket_status, false, 600)
)
INSERT INTO ticket_workflow_stages (
  workflow_id,
  code,
  name,
  stage_type,
  lifecycle_status,
  is_initial,
  sort_order
)
SELECT
  global_workflow.id,
  stage_data.code,
  stage_data.name,
  stage_data.stage_type,
  stage_data.lifecycle_status,
  stage_data.is_initial,
  stage_data.sort_order
FROM global_workflow
CROSS JOIN stage_data
ON CONFLICT (workflow_id, code) DO NOTHING;

INSERT INTO ticket_workflow_states (
  ticket_id,
  global_workflow_id,
  global_stage_id,
  entered_at,
  updated_at
)
SELECT
  tickets.id,
  workflows.id,
  stages.id,
  tickets.updated_at,
  tickets.updated_at
FROM tickets
JOIN ticket_workflows workflows
  ON workflows.kind = 'global' AND workflows.active = true
JOIN ticket_workflow_stages stages
  ON stages.workflow_id = workflows.id
 AND stages.active = true
 AND stages.code = 'legacy:' || tickets.status::text
ON CONFLICT (ticket_id) DO NOTHING;

CREATE OR REPLACE FUNCTION initialize_ticket_workflow_state_after_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_workflow_id uuid;
  target_stage_id uuid;
BEGIN
  SELECT id
    INTO target_workflow_id
  FROM ticket_workflows
  WHERE kind = 'global' AND active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF target_workflow_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id
    INTO target_stage_id
  FROM ticket_workflow_stages
  WHERE workflow_id = target_workflow_id
    AND active = true
    AND code = 'legacy:' || NEW.status::text
  LIMIT 1;

  IF target_stage_id IS NULL THEN
    SELECT id
      INTO target_stage_id
    FROM ticket_workflow_stages
    WHERE workflow_id = target_workflow_id AND active = true
    ORDER BY is_initial DESC, sort_order ASC, created_at ASC
    LIMIT 1;
  END IF;

  IF target_stage_id IS NOT NULL THEN
    INSERT INTO ticket_workflow_states (
      ticket_id,
      global_workflow_id,
      global_stage_id,
      entered_at,
      updated_at
    ) VALUES (
      NEW.id,
      target_workflow_id,
      target_stage_id,
      NEW.created_at,
      NEW.created_at
    )
    ON CONFLICT (ticket_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_initialize_workflow_state ON tickets;
CREATE TRIGGER tickets_initialize_workflow_state
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION initialize_ticket_workflow_state_after_insert();
