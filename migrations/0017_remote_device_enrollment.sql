DO $$ BEGIN
  CREATE TYPE remote_enrollment_status AS ENUM (
    'pending', 'downloaded', 'completed', 'failed', 'cancelled', 'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE remote_devices
  ADD COLUMN IF NOT EXISTS provider_group_id text,
  ADD COLUMN IF NOT EXISTS online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_online_at timestamptz;

CREATE INDEX IF NOT EXISTS remote_devices_provider_group_idx
  ON remote_devices(provider, provider_group_id);

CREATE TABLE IF NOT EXISTS remote_customer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE CASCADE,
  customer_organization_id uuid REFERENCES customer_organizations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'meshcentral',
  provider_group_id text NOT NULL,
  provider_group_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT remote_customer_groups_subject_check CHECK (
    customer_contact_id IS NOT NULL OR customer_organization_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS remote_customer_groups_provider_unique
  ON remote_customer_groups(provider, provider_group_id);
CREATE UNIQUE INDEX IF NOT EXISTS remote_customer_groups_org_unique
  ON remote_customer_groups(provider, customer_organization_id)
  WHERE customer_organization_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS remote_customer_groups_contact_unique
  ON remote_customer_groups(provider, customer_contact_id)
  WHERE customer_organization_id IS NULL AND customer_contact_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS remote_device_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  web_chat_session_id uuid REFERENCES web_chat_sessions(id) ON DELETE SET NULL,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  customer_organization_id uuid REFERENCES customer_organizations(id) ON DELETE SET NULL,
  remote_customer_group_id uuid NOT NULL REFERENCES remote_customer_groups(id) ON DELETE CASCADE,
  requested_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  token_hash text NOT NULL,
  status remote_enrollment_status NOT NULL DEFAULT 'pending',
  baseline_provider_device_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  device_id uuid REFERENCES remote_devices(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  downloaded_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS remote_device_enrollments_token_unique
  ON remote_device_enrollments(token_hash);
CREATE UNIQUE INDEX IF NOT EXISTS remote_device_enrollments_group_open_unique
  ON remote_device_enrollments(remote_customer_group_id)
  WHERE status IN ('pending', 'downloaded');
CREATE INDEX IF NOT EXISTS remote_device_enrollments_ticket_idx
  ON remote_device_enrollments(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS remote_device_enrollments_status_idx
  ON remote_device_enrollments(status, expires_at);
