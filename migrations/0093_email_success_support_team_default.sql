-- Preserve existing custom routing and let success inbox inherit the Support team
-- only when its queue has never been configured.
UPDATE support_queues AS success_queue
SET team_id = support_queue.team_id,
    updated_at = now()
FROM support_queues AS support_queue
WHERE success_queue.code = 'sucesso'
  AND support_queue.code = 'support'
  AND support_queue.team_id IS NOT NULL
  AND success_queue.team_id IS NULL;
