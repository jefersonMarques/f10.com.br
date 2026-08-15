CREATE TABLE IF NOT EXISTS operations_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TYPE remote_support_status AS ENUM (
    'requested', 'authorized', 'denied', 'active', 'ended', 'failed', 'cancelled', 'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS remote_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  customer_organization_id uuid REFERENCES customer_organizations(id) ON DELETE SET NULL,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'meshcentral',
  provider_device_id text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS remote_devices_provider_unique
  ON remote_devices(provider, provider_device_id);
CREATE INDEX IF NOT EXISTS remote_devices_customer_idx
  ON remote_devices(customer_contact_id, active);
CREATE INDEX IF NOT EXISTS remote_devices_organization_idx
  ON remote_devices(customer_organization_id, active);

CREATE TABLE IF NOT EXISTS remote_support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  web_chat_session_id uuid REFERENCES web_chat_sessions(id) ON DELETE SET NULL,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  device_id uuid REFERENCES remote_devices(id) ON DELETE SET NULL,
  requested_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status remote_support_status NOT NULL DEFAULT 'requested',
  consent_token_hash text NOT NULL,
  consent_expires_at timestamptz NOT NULL,
  provider_session_id text,
  failure_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  authorized_at timestamptz,
  denied_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS remote_support_sessions_consent_unique
  ON remote_support_sessions(consent_token_hash);
CREATE INDEX IF NOT EXISTS remote_support_sessions_status_idx
  ON remote_support_sessions(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS remote_support_sessions_ticket_idx
  ON remote_support_sessions(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS remote_support_sessions_requester_idx
  ON remote_support_sessions(requested_by_user_id, created_at DESC);
