ALTER TABLE scheduling_availability_profiles
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS public_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_title text NOT NULL DEFAULT 'Agendar uma conversa',
  ADD COLUMN IF NOT EXISTS public_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS add_google_meet boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_availability_public_slug_unique
  ON scheduling_availability_profiles(public_slug)
  WHERE public_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS scheduling_availability_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday integer NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduling_availability_window_weekday_check CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT scheduling_availability_window_time_check CHECK (
    start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND start_time < end_time
  )
);

CREATE INDEX IF NOT EXISTS scheduling_availability_windows_user_idx
  ON scheduling_availability_windows(user_id, weekday, sort_order);

INSERT INTO scheduling_availability_windows (user_id, weekday, start_time, end_time, sort_order)
SELECT
  profile.user_id,
  weekday.value::integer,
  profile.start_time,
  profile.end_time,
  0
FROM scheduling_availability_profiles profile
CROSS JOIN LATERAL jsonb_array_elements_text(profile.weekdays) AS weekday(value)
WHERE NOT EXISTS (
  SELECT 1
  FROM scheduling_availability_windows existing
  WHERE existing.user_id = profile.user_id
);

CREATE TABLE IF NOT EXISTS scheduling_availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  available boolean NOT NULL DEFAULT false,
  start_time text,
  end_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduling_availability_exception_time_check CHECK (
    (
      available = false
      AND start_time IS NULL
      AND end_time IS NULL
    )
    OR
    (
      available = true
      AND start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND start_time < end_time
    )
  )
);

CREATE INDEX IF NOT EXISTS scheduling_availability_exceptions_user_idx
  ON scheduling_availability_exceptions(user_id, exception_date);

DO $$ BEGIN
  CREATE TYPE scheduling_booking_status AS ENUM ('booking', 'booked', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS scheduling_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  customer_contact_id uuid NOT NULL REFERENCES customer_contacts(id) ON DELETE RESTRICT,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  group_id integer,
  group_name text,
  unit_id integer,
  unit_name text,
  notes text NOT NULL DEFAULT '',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  buffer_before_minutes integer NOT NULL DEFAULT 0,
  buffer_after_minutes integer NOT NULL DEFAULT 0,
  status scheduling_booking_status NOT NULL DEFAULT 'booking',
  booking_started_at timestamptz NOT NULL DEFAULT now(),
  booked_at timestamptz,
  cancelled_at timestamptz,
  google_calendar_id text NOT NULL DEFAULT 'primary',
  google_event_id text,
  google_ical_uid text,
  google_meet_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduling_booking_interval_check CHECK (start_at < end_at),
  CONSTRAINT scheduling_booking_buffer_before_check CHECK (buffer_before_minutes BETWEEN 0 AND 240),
  CONSTRAINT scheduling_booking_buffer_after_check CHECK (buffer_after_minutes BETWEEN 0 AND 240)
);

CREATE INDEX IF NOT EXISTS scheduling_bookings_host_idx
  ON scheduling_bookings(host_user_id, status, start_at, end_at);

CREATE INDEX IF NOT EXISTS scheduling_bookings_customer_idx
  ON scheduling_bookings(customer_contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS scheduling_bookings_active_idx
  ON scheduling_bookings(host_user_id, start_at, end_at)
  WHERE status IN ('booking', 'booked');

ALTER TABLE google_calendar_sources
  ADD COLUMN IF NOT EXISTS blocks_scheduling boolean NOT NULL DEFAULT false;

UPDATE google_calendar_sources
SET blocks_scheduling = true
WHERE is_primary = true;
