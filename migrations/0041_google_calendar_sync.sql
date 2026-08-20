CREATE TABLE IF NOT EXISTS google_calendar_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  target_calendar_id text NOT NULL DEFAULT 'primary',
  sync_tasks_to_google boolean NOT NULL DEFAULT false,
  sync_tickets_to_google boolean NOT NULL DEFAULT false,
  sync_scheduling_to_google boolean NOT NULL DEFAULT true,
  sync_google_changes_to_f10 boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS google_calendar_sources (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calendar_id text NOT NULL,
  calendar_name text NOT NULL DEFAULT '',
  access_role text NOT NULL DEFAULT 'reader',
  is_primary boolean NOT NULL DEFAULT false,
  visible_in_f10 boolean NOT NULL DEFAULT false,
  import_mode text NOT NULL DEFAULT 'view_only',
  import_project_id uuid REFERENCES task_projects(id) ON DELETE SET NULL,
  import_assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, calendar_id),
  CONSTRAINT google_calendar_sources_import_mode_check
    CHECK (import_mode IN ('hidden', 'view_only', 'task'))
);

CREATE INDEX IF NOT EXISTS google_calendar_sources_visible_idx
  ON google_calendar_sources(user_id, visible_in_f10);

ALTER TABLE task_google_calendar_links
  ADD COLUMN IF NOT EXISTS sync_direction text NOT NULL DEFAULT 'f10_to_google',
  ADD COLUMN IF NOT EXISTS auto_managed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS imported_from_google boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_source text NOT NULL DEFAULT 'f10';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_google_calendar_links_sync_direction_check'
  ) THEN
    ALTER TABLE task_google_calendar_links
      ADD CONSTRAINT task_google_calendar_links_sync_direction_check
      CHECK (sync_direction IN ('f10_to_google', 'bidirectional'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_google_calendar_links_last_sync_source_check'
  ) THEN
    ALTER TABLE task_google_calendar_links
      ADD CONSTRAINT task_google_calendar_links_last_sync_source_check
      CHECK (last_sync_source IN ('f10', 'google'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ticket_google_calendar_links (
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_calendar_id text NOT NULL DEFAULT 'primary',
  google_event_id text NOT NULL,
  google_ical_uid text,
  google_html_link text,
  auto_managed boolean NOT NULL DEFAULT true,
  google_updated_at timestamptz,
  last_synced_at timestamptz,
  last_sync_error text,
  last_sync_source text NOT NULL DEFAULT 'f10',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id),
  CONSTRAINT ticket_google_calendar_links_last_sync_source_check
    CHECK (last_sync_source IN ('f10', 'google'))
);

CREATE INDEX IF NOT EXISTS ticket_google_calendar_links_user_idx
  ON ticket_google_calendar_links(user_id);
CREATE INDEX IF NOT EXISTS ticket_google_calendar_links_event_idx
  ON ticket_google_calendar_links(user_id, google_calendar_id, google_event_id);
