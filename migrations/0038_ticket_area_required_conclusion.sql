INSERT INTO ticket_workflow_stages (
  workflow_id,
  name,
  stage_type,
  lifecycle_status,
  is_initial,
  sort_order,
  active,
  color
)
SELECT
  workflows.id,
  'Concluído',
  'terminal',
  'in_progress',
  false,
  COALESCE(MAX(stages.sort_order), 0) + 100,
  true,
  'green'
FROM ticket_workflows workflows
LEFT JOIN ticket_workflow_stages stages
  ON stages.workflow_id = workflows.id
WHERE workflows.kind = 'area'
  AND workflows.active = true
  AND NOT EXISTS (
    SELECT 1
    FROM ticket_workflow_stages terminal_stages
    WHERE terminal_stages.workflow_id = workflows.id
      AND terminal_stages.stage_type = 'terminal'
      AND terminal_stages.active = true
  )
GROUP BY workflows.id;
