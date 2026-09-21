ALTER TABLE ticket_workflow_stages
  ADD COLUMN IF NOT EXISTS allow_ticket_start boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ticket_workflow_stages_ticket_start_idx
  ON ticket_workflow_stages(allow_ticket_start, active, sort_order);
