WITH support_team AS (
  SELECT team_id
  FROM support_queues
  WHERE code = 'support'
    AND active = true
  LIMIT 1
)
UPDATE support_queues target
SET team_id = COALESCE(target.team_id, support_team.team_id),
    updated_at = now()
FROM support_team
WHERE target.code IN ('service_nfse', 'service_cell_coin')
  AND target.active = true
  AND target.team_id IS NULL
  AND support_team.team_id IS NOT NULL;

WITH support_team AS (
  SELECT team_id
  FROM support_queues
  WHERE code = 'support'
    AND active = true
  LIMIT 1
)
UPDATE ticket_areas target
SET team_id = COALESCE(target.team_id, support_team.team_id),
    updated_at = now()
FROM support_team
WHERE lower(btrim(target.name)) IN ('nota fiscal', 'cell coin')
  AND target.active = true
  AND target.team_id IS NULL
  AND support_team.team_id IS NOT NULL;
