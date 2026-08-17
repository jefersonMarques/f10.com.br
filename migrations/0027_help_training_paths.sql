CREATE TABLE IF NOT EXISTS help_training_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  audience text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  welcome_message text NOT NULL DEFAULT '',
  status help_content_status NOT NULL DEFAULT 'draft',
  current_version integer NOT NULL DEFAULT 0,
  support_queue_id uuid REFERENCES support_queues(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_training_paths_status_idx
  ON help_training_paths(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS help_training_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES help_training_paths(id) ON DELETE CASCADE,
  title text NOT NULL,
  instruction text NOT NULL DEFAULT '',
  expected_result text NOT NULL DEFAULT '',
  success_message text NOT NULL DEFAULT '',
  estimated_seconds integer NOT NULL DEFAULT 45 CHECK (estimated_seconds BETWEEN 5 AND 900),
  sort_order integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path_id, sort_order)
);

CREATE INDEX IF NOT EXISTS help_training_steps_path_idx
  ON help_training_steps(path_id, sort_order);

CREATE TABLE IF NOT EXISTS help_training_step_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES help_training_steps(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  asset_id uuid REFERENCES help_assets(id) ON DELETE RESTRICT,
  source_url text,
  alt_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (media_type = 'image' AND asset_id IS NOT NULL AND source_url IS NULL)
    OR
    (media_type = 'video' AND asset_id IS NULL AND source_url IS NOT NULL)
  ),
  UNIQUE (step_id, sort_order)
);

CREATE INDEX IF NOT EXISTS help_training_step_media_step_idx
  ON help_training_step_media(step_id, sort_order);
CREATE INDEX IF NOT EXISTS help_training_step_media_asset_idx
  ON help_training_step_media(asset_id)
  WHERE asset_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS help_training_failure_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES help_training_steps(id) ON DELETE CASCADE,
  reason_key text NOT NULL,
  label text NOT NULL,
  recovery_message text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (step_id, reason_key),
  UNIQUE (step_id, sort_order)
);

CREATE INDEX IF NOT EXISTS help_training_failure_reasons_step_idx
  ON help_training_failure_reasons(step_id, sort_order);

CREATE TABLE IF NOT EXISTS help_training_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES help_training_paths(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  published_by uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path_id, version)
);

CREATE INDEX IF NOT EXISTS help_training_versions_path_idx
  ON help_training_versions(path_id, version DESC);

CREATE TABLE IF NOT EXISTS help_training_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES help_training_paths(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES help_training_versions(id) ON DELETE RESTRICT,
  participant_name text NOT NULL,
  participant_email text NOT NULL,
  organization_name text NOT NULL DEFAULT '',
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_training_invites_path_idx
  ON help_training_invites(path_id, created_at DESC);
CREATE INDEX IF NOT EXISTS help_training_invites_email_idx
  ON help_training_invites(lower(participant_email));

CREATE TABLE IF NOT EXISTS help_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL UNIQUE REFERENCES help_training_invites(id) ON DELETE CASCADE,
  session_token_hash text NOT NULL UNIQUE,
  current_step_index integer NOT NULL DEFAULT 0 CHECK (current_step_index >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  support_ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_training_sessions_activity_idx
  ON help_training_sessions(last_activity_at DESC);

CREATE TABLE IF NOT EXISTS help_training_step_progress (
  session_id uuid NOT NULL REFERENCES help_training_sessions(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'blocked', 'help_requested')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  failure_reason_key text,
  failure_detail text NOT NULL DEFAULT '',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  help_ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, step_key)
);

CREATE INDEX IF NOT EXISTS help_training_step_progress_status_idx
  ON help_training_step_progress(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS help_training_events (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES help_training_sessions(id) ON DELETE CASCADE,
  step_key text,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_training_events_session_idx
  ON help_training_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS help_training_events_type_idx
  ON help_training_events(event_type, created_at DESC);

-- Managed assets used by a draft trail or by an immutable published trail version
-- must keep the same protection already used by structured Help content.
CREATE OR REPLACE FUNCTION f10_guard_help_asset_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM help_step_blocks WHERE asset_id = OLD.id
  ) OR EXISTS (
    SELECT 1 FROM help_training_step_media WHERE asset_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'HELP_ASSET_IN_USE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM help_publications publication
    WHERE publication.entity_type = 'content'
      AND jsonb_path_exists(
        publication.snapshot,
        '$.public.steps[*].blocks[*].asset ? (@.id == $assetId)',
        jsonb_build_object('assetId', to_jsonb(OLD.id::text))
      )
  ) OR EXISTS (
    SELECT 1
    FROM help_training_versions version
    WHERE jsonb_path_exists(
      version.snapshot,
      '$.steps[*].images[*] ? (@.assetId == $assetId)',
      jsonb_build_object('assetId', to_jsonb(OLD.id::text))
    )
  ) THEN
    RAISE EXCEPTION 'HELP_ASSET_PUBLISHED';
  END IF;

  IF OLD.storage_key IS NOT NULL
    AND current_setting('f10.allow_managed_asset_delete', true) IS DISTINCT FROM 'on'
  THEN
    RETURN NULL;
  END IF;

  RETURN OLD;
END;
$$;
