ALTER TABLE ticket_customer_contexts
  ALTER COLUMN legacy_user_id DROP NOT NULL;

ALTER TABLE ticket_customer_contexts
  ADD COLUMN IF NOT EXISTS subgroup boolean;

ALTER TABLE service_requests
  ALTER COLUMN customer_contact_id DROP NOT NULL,
  ALTER COLUMN legacy_user_id DROP NOT NULL,
  ALTER COLUMN group_id DROP NOT NULL,
  ALTER COLUMN group_name DROP NOT NULL,
  ALTER COLUMN unit_id DROP NOT NULL,
  ALTER COLUMN unit_name DROP NOT NULL,
  ALTER COLUMN unit_schema DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS service_requests_public_type_idempotency_unique
  ON service_requests(request_type, idempotency_key)
  WHERE customer_contact_id IS NULL;
