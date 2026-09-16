CREATE TABLE IF NOT EXISTS service_request_email_recipients (
  request_type service_request_type PRIMARY KEY,
  recipient_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
