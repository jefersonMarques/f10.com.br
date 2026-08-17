ALTER TABLE task_google_calendar_links
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reminder_minutes integer,
  ADD COLUMN IF NOT EXISTS attendees jsonb NOT NULL DEFAULT '[]'::jsonb;
