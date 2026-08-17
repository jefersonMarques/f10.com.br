CREATE TABLE IF NOT EXISTS task_google_calendar_links (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_calendar_id text NOT NULL DEFAULT 'primary',
  google_event_id text NOT NULL,
  google_html_link text,
  all_day boolean NOT NULL DEFAULT true,
  start_time text,
  end_time text,
  time_zone text NOT NULL DEFAULT 'UTC',
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id),
  CONSTRAINT task_google_calendar_links_time_pair_check
    CHECK ((start_time IS NULL AND end_time IS NULL) OR (start_time IS NOT NULL AND end_time IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS task_google_calendar_links_user_idx
  ON task_google_calendar_links(user_id);

CREATE INDEX IF NOT EXISTS task_google_calendar_links_event_idx
  ON task_google_calendar_links(user_id, google_event_id);
