ALTER TABLE support_queues
  ADD COLUMN default_due_days INTEGER NOT NULL DEFAULT 3;

ALTER TABLE support_queues
  ADD CONSTRAINT support_queues_default_due_days_check
  CHECK (default_due_days BETWEEN 1 AND 365);

ALTER TABLE tickets
  ADD COLUMN due_on DATE;

UPDATE tickets AS ticket
SET due_on = COALESCE(
  ticket.resolution_due_at::date,
  ticket.created_at::date + queue.default_due_days
)
FROM support_queues AS queue
WHERE queue.id = ticket.queue_id;

UPDATE tickets
SET due_on = COALESCE(
  due_on,
  resolution_due_at::date,
  created_at::date + 3
);

ALTER TABLE tickets
  ALTER COLUMN due_on SET DEFAULT (CURRENT_DATE + 3),
  ALTER COLUMN due_on SET NOT NULL;

CREATE INDEX tickets_due_on_status_idx
  ON tickets (due_on, status);
