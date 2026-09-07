CREATE OR REPLACE FUNCTION initialize_ticket_workflow_state_after_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_workflow_id uuid;
  target_stage_id uuid;
BEGIN
  -- O Portal do Cliente define o workflow/etapa explicitamente na mesma transação.
  IF NEW.channel = 'portal' THEN
    RETURN NEW;
  END IF;

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
    WHERE workflow_id = target_workflow_id
      AND active = true
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
