DELETE FROM service_request_email_recipients
WHERE recipient_user_id IS NULL;

ALTER TABLE service_request_email_recipients
  DROP CONSTRAINT IF EXISTS service_request_email_recipients_pkey;

ALTER TABLE service_request_email_recipients
  DROP CONSTRAINT IF EXISTS service_request_email_recipients_recipient_user_id_fkey;

ALTER TABLE service_request_email_recipients
  ALTER COLUMN recipient_user_id SET NOT NULL;

ALTER TABLE service_request_email_recipients
  ADD CONSTRAINT service_request_email_recipients_recipient_user_id_fkey
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE service_request_email_recipients
  ADD CONSTRAINT service_request_email_recipients_pkey
  PRIMARY KEY (request_type, recipient_user_id);
