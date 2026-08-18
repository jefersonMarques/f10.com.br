DO $$ BEGIN
  CREATE TYPE scheduling_invitation_status AS ENUM (
    'draft', 'sent', 'opened', 'booking', 'booked', 'expired', 'revoked', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS scheduling_availability_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  time_zone text NOT NULL DEFAULT 'America/Sao_Paulo',
  weekdays jsonb NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  start_time text NOT NULL DEFAULT '08:00',
  end_time text NOT NULL DEFAULT '18:00',
  slot_step_minutes integer NOT NULL DEFAULT 30,
  minimum_notice_minutes integer NOT NULL DEFAULT 120,
  buffer_before_minutes integer NOT NULL DEFAULT 0,
  buffer_after_minutes integer NOT NULL DEFAULT 0,
  max_horizon_days integer NOT NULL DEFAULT 30,
  default_duration_minutes integer NOT NULL DEFAULT 30,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduling_availability_time_check CHECK (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND start_time < end_time),
  CONSTRAINT scheduling_availability_step_check CHECK (slot_step_minutes BETWEEN 5 AND 120),
  CONSTRAINT scheduling_availability_notice_check CHECK (minimum_notice_minutes BETWEEN 0 AND 43200),
  CONSTRAINT scheduling_availability_buffer_before_check CHECK (buffer_before_minutes BETWEEN 0 AND 240),
  CONSTRAINT scheduling_availability_buffer_after_check CHECK (buffer_after_minutes BETWEEN 0 AND 240),
  CONSTRAINT scheduling_availability_horizon_check CHECK (max_horizon_days BETWEEN 1 AND 90),
  CONSTRAINT scheduling_availability_duration_check CHECK (default_duration_minutes BETWEEN 15 AND 240)
);

CREATE TABLE IF NOT EXISTS scheduling_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  title text NOT NULL,
  host_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  duration_minutes integer NOT NULL,
  time_zone text NOT NULL,
  working_weekdays jsonb NOT NULL DEFAULT '[]'::jsonb,
  working_start_time text NOT NULL,
  working_end_time text NOT NULL,
  slot_step_minutes integer NOT NULL,
  minimum_notice_minutes integer NOT NULL,
  buffer_before_minutes integer NOT NULL DEFAULT 0,
  buffer_after_minutes integer NOT NULL DEFAULT 0,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  add_google_meet boolean NOT NULL DEFAULT false,
  status scheduling_invitation_status NOT NULL DEFAULT 'draft',
  expires_at timestamptz NOT NULL,
  sent_at timestamptz,
  opened_at timestamptz,
  booking_started_at timestamptz,
  booked_at timestamptz,
  selected_start_at timestamptz,
  selected_end_at timestamptz,
  google_calendar_id text NOT NULL DEFAULT 'primary',
  google_event_id text,
  google_ical_uid text,
  google_meet_url text,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  group_id integer,
  group_name text,
  unit_id integer,
  unit_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduling_invitation_duration_check CHECK (duration_minutes BETWEEN 15 AND 240),
  CONSTRAINT scheduling_invitation_range_check CHECK (date_range_end >= date_range_start),
  CONSTRAINT scheduling_invitation_work_time_check CHECK (working_start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND working_end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND working_start_time < working_end_time),
  CONSTRAINT scheduling_invitation_step_check CHECK (slot_step_minutes BETWEEN 5 AND 120),
  CONSTRAINT scheduling_invitation_notice_check CHECK (minimum_notice_minutes BETWEEN 0 AND 43200),
  CONSTRAINT scheduling_invitation_buffer_before_check CHECK (buffer_before_minutes BETWEEN 0 AND 240),
  CONSTRAINT scheduling_invitation_buffer_after_check CHECK (buffer_after_minutes BETWEEN 0 AND 240),
  CONSTRAINT scheduling_invitation_selected_interval_check CHECK (
    (selected_start_at IS NULL AND selected_end_at IS NULL) OR
    (selected_start_at IS NOT NULL AND selected_end_at IS NOT NULL AND selected_end_at > selected_start_at)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_invitations_token_unique
  ON scheduling_invitations(token_hash);
CREATE INDEX IF NOT EXISTS scheduling_invitations_creator_idx
  ON scheduling_invitations(created_by_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scheduling_invitations_host_idx
  ON scheduling_invitations(host_user_id, status, date_range_start, date_range_end);
CREATE INDEX IF NOT EXISTS scheduling_invitations_customer_idx
  ON scheduling_invitations(customer_contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scheduling_invitations_booking_idx
  ON scheduling_invitations(host_user_id, selected_start_at, selected_end_at)
  WHERE status IN ('booking', 'booked');

CREATE TABLE IF NOT EXISTS scheduling_rate_limits (
  key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scheduling_rate_limits_updated_idx
  ON scheduling_rate_limits(updated_at);

INSERT INTO permissions (code, name, description)
VALUES
  ('scheduling.create', 'Criar agendamentos', 'Permite criar links de agendamento dentro do escopo concedido.'),
  ('scheduling.view', 'Visualizar agendamentos', 'Permite visualizar convites e agendamentos dentro do escopo concedido.'),
  ('scheduling.manage', 'Administrar agendamentos', 'Permite configurar disponibilidade e administrar convites de agendamento.')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_code, scope)
SELECT roles.id, permission_data.code, 'all'::permission_scope
FROM roles
CROSS JOIN (
  VALUES ('scheduling.create'), ('scheduling.view'), ('scheduling.manage')
) AS permission_data(code)
WHERE roles.code IN ('SUPER_ADMIN', 'ADMIN')
ON CONFLICT (role_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;

INSERT INTO role_permissions (role_id, permission_code, scope)
SELECT roles.id, permission_data.code, permission_data.scope::permission_scope
FROM roles
CROSS JOIN (
  VALUES
    ('scheduling.create', 'own'),
    ('scheduling.view', 'own')
) AS permission_data(code, scope)
WHERE roles.code = 'EMPLOYEE'
ON CONFLICT (role_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;
