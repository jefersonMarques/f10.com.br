CREATE TYPE scheduling_event_status AS ENUM ('confirmed', 'cancelled');
CREATE TYPE scheduling_event_participant_kind AS ENUM ('internal', 'external');

CREATE TABLE scheduling_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  time_zone text NOT NULL DEFAULT 'America/Sao_Paulo',
  status scheduling_event_status NOT NULL DEFAULT 'confirmed',
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  group_id integer,
  group_name text,
  unit_id integer,
  unit_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduling_events_valid_interval CHECK (ends_at > starts_at)
);

CREATE INDEX scheduling_events_organizer_start_idx
  ON scheduling_events (organizer_user_id, starts_at);
CREATE INDEX scheduling_events_interval_idx
  ON scheduling_events (starts_at, ends_at);
CREATE INDEX scheduling_events_status_idx
  ON scheduling_events (status);
CREATE INDEX scheduling_events_ticket_idx
  ON scheduling_events (ticket_id)
  WHERE ticket_id IS NOT NULL;
CREATE INDEX scheduling_events_task_idx
  ON scheduling_events (task_id)
  WHERE task_id IS NOT NULL;

CREATE TABLE scheduling_event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES scheduling_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  kind scheduling_event_participant_kind NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduling_event_participants_identity_check CHECK (
    (kind = 'internal' AND user_id IS NOT NULL)
    OR
    (kind = 'external' AND (customer_contact_id IS NOT NULL OR length(trim(email)) > 0))
  )
);

CREATE INDEX scheduling_event_participants_event_idx
  ON scheduling_event_participants (event_id);
CREATE INDEX scheduling_event_participants_user_idx
  ON scheduling_event_participants (user_id, event_id)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX scheduling_event_participants_internal_unique
  ON scheduling_event_participants (event_id, user_id)
  WHERE kind = 'internal' AND user_id IS NOT NULL;
CREATE UNIQUE INDEX scheduling_event_participants_external_email_unique
  ON scheduling_event_participants (event_id, lower(email))
  WHERE kind = 'external' AND length(trim(email)) > 0;

CREATE TABLE scheduling_event_google_calendar_links (
  event_id uuid NOT NULL REFERENCES scheduling_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_calendar_id text NOT NULL DEFAULT 'primary',
  google_event_id text,
  google_ical_uid text,
  google_html_link text,
  google_meet_url text,
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX scheduling_event_google_links_user_idx
  ON scheduling_event_google_calendar_links (user_id);
CREATE INDEX scheduling_event_google_links_event_idx
  ON scheduling_event_google_calendar_links (user_id, google_calendar_id, google_event_id)
  WHERE google_event_id IS NOT NULL;

ALTER TABLE scheduling_invitations
  ADD COLUMN event_id uuid REFERENCES scheduling_events(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX scheduling_invitations_event_unique
  ON scheduling_invitations (event_id)
  WHERE event_id IS NOT NULL;

ALTER TABLE google_calendar_preferences
  ALTER COLUMN sync_scheduling_to_google SET DEFAULT false;
