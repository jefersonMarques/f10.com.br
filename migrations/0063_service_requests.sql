DO $$ BEGIN
  CREATE TYPE service_request_type AS ENUM ('nfse', 'cell_coin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_request_change_source AS ENUM ('customer', 'user', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS service_request_routes (
  request_type service_request_type PRIMARY KEY,
  queue_id uuid NOT NULL REFERENCES support_queues(id) ON DELETE RESTRICT,
  area_id uuid NOT NULL REFERENCES ticket_areas(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  request_type service_request_type NOT NULL,
  customer_contact_id uuid NOT NULL REFERENCES customer_contacts(id) ON DELETE RESTRICT,
  legacy_user_id text NOT NULL,
  group_id integer NOT NULL,
  group_name text NOT NULL,
  unit_id integer NOT NULL,
  unit_name text NOT NULL,
  unit_schema text NOT NULL,
  idempotency_key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  secrets_encrypted jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_requests_idempotency_key_check CHECK (char_length(idempotency_key) BETWEEN 16 AND 128),
  CONSTRAINT service_requests_version_check CHECK (version > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS service_requests_customer_type_idempotency_unique
  ON service_requests(customer_contact_id, request_type, idempotency_key);
CREATE INDEX IF NOT EXISTS service_requests_unit_type_idx
  ON service_requests(group_id, unit_id, request_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS service_requests_ticket_idx
  ON service_requests(ticket_id);

CREATE TABLE IF NOT EXISTS service_request_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  storage_key text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  checksum_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_request_attachments_size_check CHECK (size_bytes > 0 AND size_bytes <= 20971520)
);

CREATE UNIQUE INDEX IF NOT EXISTS service_request_attachments_storage_key_unique
  ON service_request_attachments(storage_key);
CREATE INDEX IF NOT EXISTS service_request_attachments_request_idx
  ON service_request_attachments(service_request_id, created_at);

CREATE TABLE IF NOT EXISTS service_request_change_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  version integer NOT NULL,
  source service_request_change_source NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_request_change_sets_version_check CHECK (version > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS service_request_change_sets_version_unique
  ON service_request_change_sets(service_request_id, version);
CREATE INDEX IF NOT EXISTS service_request_change_sets_request_idx
  ON service_request_change_sets(service_request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS service_request_field_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_set_id uuid NOT NULL REFERENCES service_request_change_sets(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  previous_value jsonb,
  next_value jsonb,
  secret_changed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_request_field_changes_set_idx
  ON service_request_field_changes(change_set_id, created_at);

INSERT INTO support_queues (code, name, default_due_days, active)
VALUES
  ('service_nfse', 'Nota Fiscal', 3, true),
  ('service_cell_coin', 'CELL COIN', 3, true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    active = true,
    updated_at = now();

INSERT INTO ticket_areas (name, active)
SELECT area_name, true
FROM (VALUES ('Nota Fiscal'), ('CELL COIN')) AS requested(area_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM ticket_areas areas
  WHERE areas.active = true
    AND lower(btrim(areas.name)) = lower(btrim(requested.area_name))
);

INSERT INTO ticket_workflows (name, kind, area_id, active)
SELECT
  'Processo · ' || areas.name,
  'area'::ticket_workflow_kind,
  areas.id,
  true
FROM ticket_areas areas
WHERE areas.active = true
  AND lower(btrim(areas.name)) IN ('nota fiscal', 'cell coin')
  AND NOT EXISTS (
    SELECT 1
    FROM ticket_workflows workflows
    WHERE workflows.kind = 'area'
      AND workflows.area_id = areas.id
      AND workflows.active = true
  );

WITH target_workflows AS (
  SELECT workflows.id, lower(btrim(areas.name)) AS area_name
  FROM ticket_workflows workflows
  JOIN ticket_areas areas ON areas.id = workflows.area_id
  WHERE workflows.kind = 'area'
    AND workflows.active = true
    AND areas.active = true
    AND lower(btrim(areas.name)) IN ('nota fiscal', 'cell coin')
), stage_data(area_name, code, name, stage_type, lifecycle_status, is_initial, sort_order, color) AS (
  VALUES
    ('nota fiscal', 'service:nfse:received', 'Recebido', 'normal'::ticket_workflow_stage_type, 'open'::ticket_status, true, 100, 'gray'),
    ('nota fiscal', 'service:nfse:done', 'Concluído', 'terminal'::ticket_workflow_stage_type, 'in_progress'::ticket_status, false, 200, 'green'),
    ('cell coin', 'service:cell_coin:received', 'Recebido', 'normal'::ticket_workflow_stage_type, 'open'::ticket_status, true, 100, 'gray'),
    ('cell coin', 'service:cell_coin:done', 'Concluído', 'terminal'::ticket_workflow_stage_type, 'in_progress'::ticket_status, false, 200, 'green')
)
INSERT INTO ticket_workflow_stages (
  workflow_id,
  code,
  name,
  stage_type,
  lifecycle_status,
  is_initial,
  sort_order,
  color,
  active
)
SELECT
  target_workflows.id,
  stage_data.code,
  stage_data.name,
  stage_data.stage_type,
  stage_data.lifecycle_status,
  stage_data.is_initial,
  stage_data.sort_order,
  stage_data.color,
  true
FROM target_workflows
JOIN stage_data ON stage_data.area_name = target_workflows.area_name
ON CONFLICT (workflow_id, code) DO UPDATE
SET name = EXCLUDED.name,
    stage_type = EXCLUDED.stage_type,
    lifecycle_status = EXCLUDED.lifecycle_status,
    sort_order = EXCLUDED.sort_order,
    color = EXCLUDED.color,
    active = true,
    updated_at = now();

WITH global_workflow AS (
  SELECT id
  FROM ticket_workflows
  WHERE kind = 'global' AND active = true
  ORDER BY created_at ASC
  LIMIT 1
), area_data(code, name, area_name, sort_order) AS (
  VALUES
    ('service:nfse', 'Nota Fiscal', 'nota fiscal', 250),
    ('service:cell_coin', 'CELL COIN', 'cell coin', 260)
), target_areas AS (
  SELECT areas.id, area_data.code, area_data.name, area_data.sort_order
  FROM ticket_areas areas
  JOIN area_data ON lower(btrim(areas.name)) = area_data.area_name
  WHERE areas.active = true
)
INSERT INTO ticket_workflow_stages (
  workflow_id,
  code,
  name,
  stage_type,
  linked_area_id,
  lifecycle_status,
  is_initial,
  sort_order,
  color,
  active
)
SELECT
  global_workflow.id,
  target_areas.code,
  target_areas.name,
  'area_gateway'::ticket_workflow_stage_type,
  target_areas.id,
  'open'::ticket_status,
  false,
  target_areas.sort_order,
  'orange',
  true
FROM global_workflow
CROSS JOIN target_areas
ON CONFLICT (workflow_id, code) DO UPDATE
SET name = EXCLUDED.name,
    linked_area_id = EXCLUDED.linked_area_id,
    lifecycle_status = EXCLUDED.lifecycle_status,
    sort_order = EXCLUDED.sort_order,
    color = EXCLUDED.color,
    active = true,
    updated_at = now();

INSERT INTO service_request_routes (request_type, queue_id, area_id, active)
SELECT
  route_data.request_type::service_request_type,
  queues.id,
  areas.id,
  true
FROM (VALUES
  ('nfse', 'service_nfse', 'nota fiscal'),
  ('cell_coin', 'service_cell_coin', 'cell coin')
) AS route_data(request_type, queue_code, area_name)
JOIN support_queues queues ON queues.code = route_data.queue_code
JOIN ticket_areas areas ON lower(btrim(areas.name)) = route_data.area_name AND areas.active = true
ON CONFLICT (request_type) DO UPDATE
SET queue_id = EXCLUDED.queue_id,
    area_id = EXCLUDED.area_id,
    active = true,
    updated_at = now();
