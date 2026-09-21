ALTER TABLE help_training_paths
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'invite_only';

ALTER TABLE help_training_steps
  ADD COLUMN IF NOT EXISTS interaction_mode text NOT NULL DEFAULT 'action';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'help_training_paths_access_mode_check'
  ) THEN
    ALTER TABLE help_training_paths
      ADD CONSTRAINT help_training_paths_access_mode_check
      CHECK (access_mode IN ('invite_only', 'public'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'help_training_steps_interaction_mode_check'
  ) THEN
    ALTER TABLE help_training_steps
      ADD CONSTRAINT help_training_steps_interaction_mode_check
      CHECK (interaction_mode IN ('presentation', 'action'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS help_training_paths_public_idx
  ON help_training_paths(access_mode, status, slug);

CREATE TABLE IF NOT EXISTS help_training_public_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES help_training_versions(id) ON DELETE RESTRICT,
  session_token_hash text NOT NULL UNIQUE,
  current_step_index integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_training_public_sessions_version_idx
  ON help_training_public_sessions(version_id, last_activity_at);

CREATE TABLE IF NOT EXISTS help_training_public_step_progress (
  session_id uuid NOT NULL REFERENCES help_training_public_sessions(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  failure_reason_key text,
  failure_detail text NOT NULL DEFAULT '',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, step_key)
);

CREATE INDEX IF NOT EXISTS help_training_public_step_progress_status_idx
  ON help_training_public_step_progress(status, updated_at);

CREATE TABLE IF NOT EXISTS help_training_public_events (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES help_training_public_sessions(id) ON DELETE CASCADE,
  step_key text,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_training_public_events_session_idx
  ON help_training_public_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS help_training_public_events_type_idx
  ON help_training_public_events(event_type, created_at);
