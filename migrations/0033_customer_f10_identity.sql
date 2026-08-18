ALTER TABLE customer_portal_sessions
  ADD COLUMN IF NOT EXISTS auth_source text NOT NULL DEFAULT 'magic_link',
  ADD COLUMN IF NOT EXISTS legacy_user_id text,
  ADD COLUMN IF NOT EXISTS legacy_login text,
  ADD COLUMN IF NOT EXISTS legacy_token_encrypted text,
  ADD COLUMN IF NOT EXISTS legacy_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS legacy_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_group_id integer,
  ADD COLUMN IF NOT EXISTS selected_group_name text,
  ADD COLUMN IF NOT EXISTS selected_unit_id integer,
  ADD COLUMN IF NOT EXISTS selected_unit_name text,
  ADD COLUMN IF NOT EXISTS selected_unit_schema text;

CREATE INDEX IF NOT EXISTS customer_portal_sessions_legacy_user_idx
  ON customer_portal_sessions (legacy_user_id, expires_at);
CREATE INDEX IF NOT EXISTS customer_portal_sessions_unit_idx
  ON customer_portal_sessions (selected_unit_id, expires_at);

CREATE TABLE IF NOT EXISTS customer_f10_identities (
  legacy_user_id text PRIMARY KEY,
  customer_contact_id uuid NOT NULL REFERENCES customer_contacts(id) ON DELETE CASCADE,
  login_email text NOT NULL,
  first_authenticated_at timestamptz NOT NULL DEFAULT now(),
  last_authenticated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_f10_identities_contact_idx
  ON customer_f10_identities (customer_contact_id);
CREATE INDEX IF NOT EXISTS customer_f10_identities_login_idx
  ON customer_f10_identities (login_email);

CREATE TABLE IF NOT EXISTS ticket_customer_contexts (
  ticket_id uuid PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  legacy_user_id text NOT NULL,
  group_id integer NOT NULL,
  group_name text NOT NULL,
  unit_id integer NOT NULL,
  unit_name text NOT NULL,
  unit_schema text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_customer_contexts_customer_idx
  ON ticket_customer_contexts (customer_contact_id, unit_id);
CREATE INDEX IF NOT EXISTS ticket_customer_contexts_legacy_idx
  ON ticket_customer_contexts (legacy_user_id, unit_id);

CREATE TABLE IF NOT EXISTS customer_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  portal_session_id uuid REFERENCES customer_portal_sessions(id) ON DELETE SET NULL,
  legacy_user_id text,
  group_id integer,
  unit_id integer,
  event_type text NOT NULL,
  source text NOT NULL,
  path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_activity_events_customer_idx
  ON customer_activity_events (customer_contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_activity_events_legacy_idx
  ON customer_activity_events (legacy_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_activity_events_type_idx
  ON customer_activity_events (event_type, created_at DESC);
