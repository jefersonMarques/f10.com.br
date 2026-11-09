-- Vincula filas especializadas às equipes existentes, sem herdar Suporte.
-- Na ausência de uma correspondência única, mantém o acesso restrito.
WITH specialist_queues AS (
  SELECT id, code
  FROM support_queues
  WHERE code IN ('service_cell_coin', 'service_nfse')
), exact_teams AS (
  SELECT
    q.id AS queue_id,
    min(t.id::text)::uuid AS team_id,
    count(t.id) AS matching_teams
  FROM specialist_queues q
  LEFT JOIN teams t
    ON t.active = true
   AND lower(regexp_replace(btrim(t.name), '[^a-zA-Z0-9]', '', 'g')) =
     CASE q.code
       WHEN 'service_cell_coin' THEN 'cellcoin'
       WHEN 'service_nfse' THEN 'notafiscal'
     END
  GROUP BY q.id
)
UPDATE support_queues q
SET team_id = CASE WHEN match.matching_teams = 1 THEN match.team_id ELSE NULL END,
    updated_at = now()
FROM exact_teams match
WHERE q.id = match.queue_id
  AND q.team_id IS DISTINCT FROM
    CASE WHEN match.matching_teams = 1 THEN match.team_id ELSE NULL END;

-- Mantém a propriedade da área alinhada à fila especializada.
UPDATE ticket_areas area
SET team_id = q.team_id,
    updated_at = now()
FROM service_request_routes route
JOIN support_queues q ON q.id = route.queue_id
WHERE route.area_id = area.id
  AND route.request_type IN ('nfse', 'cell_coin')
  AND area.team_id IS DISTINCT FROM q.team_id;
