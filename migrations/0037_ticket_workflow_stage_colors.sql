ALTER TABLE ticket_workflow_stages
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'gray';

ALTER TABLE ticket_workflow_stages
  DROP CONSTRAINT IF EXISTS ticket_workflow_stages_color_check;

ALTER TABLE ticket_workflow_stages
  ADD CONSTRAINT ticket_workflow_stages_color_check
  CHECK (color IN ('gray', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'sky', 'lime', 'pink'));

CREATE OR REPLACE FUNCTION guard_ticket_workflow_area_exit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_stage_type ticket_workflow_stage_type;
BEGIN
  IF OLD.area_id IS NOT NULL
     AND (
       NEW.area_id IS DISTINCT FROM OLD.area_id
       OR NEW.area_workflow_id IS DISTINCT FROM OLD.area_workflow_id
     ) THEN
    SELECT stage_type
      INTO current_stage_type
      FROM ticket_workflow_stages
     WHERE id = OLD.area_stage_id;

    IF current_stage_type IS DISTINCT FROM 'terminal'::ticket_workflow_stage_type THEN
      RAISE EXCEPTION 'TICKET_WORKFLOW_AREA_NOT_COMPLETE' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticket_workflow_states_area_exit_guard
  ON ticket_workflow_states;

CREATE TRIGGER ticket_workflow_states_area_exit_guard
BEFORE UPDATE OF area_id, area_workflow_id, area_stage_id
ON ticket_workflow_states
FOR EACH ROW
EXECUTE FUNCTION guard_ticket_workflow_area_exit();
