ALTER TABLE task_google_calendar_links
  ADD COLUMN IF NOT EXISTS google_meet_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_meet_url text;
