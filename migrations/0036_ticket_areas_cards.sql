CREATE TABLE IF NOT EXISTS ticket_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  legacy_support_queue_id uuid REFERENCES support_queues(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_areas_name_check CHECK (char_length(btrim(name)) BETWEEN 2 AND 80)
);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_areas_active_name_unique
  ON ticket_areas (lower(btrim(name)))
  WHERE active = true;

CREATE UNIQUE INDEX IF NOT EXISTS ticket_areas_legacy_queue_unique
  ON ticket_areas (legacy_support_queue_id)
  WHERE legacy_support_queue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ticket_areas_team_idx
  ON ticket_areas (team_id, active, name);

ALTER TABLE ticket_workflows
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES ticket_areas(id) ON DELETE RESTRICT;

INSERT INTO ticket_areas (name, team_id, legacy_support_queue_id, created_by)
SELECT DISTINCT ON (workflows.queue_id)
  queues.name,
  queues.team_id,
  workflows.queue_id,
  workflows.created_by
FROM ticket_workflows workflows
JOIN support_queues queues ON queues.id = workflows.queue_id
WHERE workflows.kind = 'area'
  AND workflows.queue_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM ticket_areas areas
    WHERE areas.legacy_support_queue_id = workflows.queue_id
  )
ORDER BY workflows.queue_id, workflows.created_at ASC;

UPDATE ticket_workflows workflows
SET area_id = areas.id
FROM ticket_areas areas
WHERE workflows.kind = 'area'
  AND workflows.area_id IS NULL
  AND areas.legacy_support_queue_id = workflows.queue_id;

ALTER TABLE ticket_workflows
  DROP CONSTRAINT IF EXISTS ticket_workflows_area_queue_check;

ALTER TABLE ticket_workflows
  DROP CONSTRAINT IF EXISTS ticket_workflows_area_ref_check;

ALTER TABLE ticket_workflows
  ADD CONSTRAINT ticket_workflows_area_ref_check CHECK (
    (kind = 'global' AND area_id IS NULL) OR
    (kind = 'area' AND area_id IS NOT NULL)
  );

DROP INDEX IF EXISTS ticket_workflows_active_area_queue_unique;

CREATE UNIQUE INDEX IF NOT EXISTS ticket_workflows_active_area_unique
  ON ticket_workflows (area_id)
  WHERE active = true AND kind = 'area';

UPDATE ticket_workflows
SET queue_id = NULL
WHERE kind = 'area' AND area_id IS NOT NULL;

ALTER TABLE ticket_workflow_stages
  ADD COLUMN IF NOT EXISTS linked_area_id uuid REFERENCES ticket_areas(id) ON DELETE RESTRICT;

UPDATE ticket_workflow_stages stages
SET linked_area_id = areas.id
FROM ticket_areas areas
WHERE stages.stage_type = 'area_gateway'
  AND stages.linked_area_id IS NULL
  AND areas.legacy_support_queue_id = stages.linked_queue_id;

ALTER TABLE ticket_workflow_stages
  DROP CONSTRAINT IF EXISTS ticket_workflow_stages_gateway_queue_check;

ALTER TABLE ticket_workflow_stages
  DROP CONSTRAINT IF EXISTS ticket_workflow_stages_gateway_area_check;

ALTER TABLE ticket_workflow_stages
  ADD CONSTRAINT ticket_workflow_stages_gateway_area_check CHECK (
    (stage_type = 'area_gateway' AND linked_area_id IS NOT NULL) OR
    (stage_type <> 'area_gateway' AND linked_area_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS ticket_workflow_stages_area_idx
  ON ticket_workflow_stages (linked_area_id, active);

UPDATE ticket_workflow_stages
SET linked_queue_id = NULL
WHERE linked_area_id IS NOT NULL;

ALTER TABLE ticket_workflow_states
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES ticket_areas(id) ON DELETE RESTRICT;

UPDATE ticket_workflow_states states
SET area_id = workflows.area_id
FROM ticket_workflows workflows
WHERE states.area_workflow_id = workflows.id
  AND states.area_id IS NULL;

ALTER TABLE ticket_workflow_states
  DROP CONSTRAINT IF EXISTS ticket_workflow_states_area_pair_check;

ALTER TABLE ticket_workflow_states
  ADD CONSTRAINT ticket_workflow_states_area_pair_check CHECK (
    (area_id IS NULL AND area_workflow_id IS NULL AND area_stage_id IS NULL) OR
    (area_id IS NOT NULL AND area_workflow_id IS NOT NULL AND area_stage_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS ticket_workflow_states_area_id_idx
  ON ticket_workflow_states (area_id, area_stage_id, updated_at DESC);

ALTER TABLE ticket_workflow_history
  ADD COLUMN IF NOT EXISTS from_area_id uuid REFERENCES ticket_areas(id) ON DELETE SET NULL;

ALTER TABLE ticket_workflow_history
  ADD COLUMN IF NOT EXISTS to_area_id uuid REFERENCES ticket_areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ticket_workflow_history_area_idx
  ON ticket_workflow_history (to_area_id, created_at DESC);

ALTER TABLE support_tags
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'blue';

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  original_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes integer NOT NULL,
  checksum_sha256 text NOT NULL,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_attachments_size_check CHECK (size_bytes > 0 AND size_bytes <= 20971520)
);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_attachments_storage_key_unique
  ON ticket_attachments (storage_key);

CREATE INDEX IF NOT EXISTS ticket_attachments_ticket_idx
  ON ticket_attachments (ticket_id, created_at DESC);
