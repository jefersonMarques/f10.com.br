DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM (
    'new',
    'open',
    'in_progress',
    'waiting_customer',
    'resolved',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE support_channel AS ENUM ('manual', 'web_chat', 'portal', 'email', 'whatsapp');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE support_message_author AS ENUM ('customer', 'user', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE support_message_visibility AS ENUM ('public', 'internal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS customer_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  external_reference text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_organizations_external_unique
  ON customer_organizations(external_reference)
  WHERE external_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS customer_organizations_name_idx
  ON customer_organizations(name);

CREATE TABLE IF NOT EXISTS customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES customer_organizations(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_contacts_organization_idx
  ON customer_contacts(organization_id);
CREATE INDEX IF NOT EXISTS customer_contacts_email_idx
  ON customer_contacts(email);

CREATE TABLE IF NOT EXISTS support_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO support_queues (code, name)
VALUES ('support', 'Suporte F10')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  queue_id uuid NOT NULL REFERENCES support_queues(id) ON DELETE RESTRICT,
  assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  linked_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  subject text NOT NULL,
  status ticket_status NOT NULL DEFAULT 'new',
  priority ticket_priority NOT NULL DEFAULT 'normal',
  channel support_channel NOT NULL DEFAULT 'manual',
  first_response_due_at timestamptz,
  resolution_due_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_queue_idx ON tickets(queue_id, status);
CREATE INDEX IF NOT EXISTS tickets_assigned_user_idx ON tickets(assigned_user_id, status);
CREATE INDEX IF NOT EXISTS tickets_customer_idx ON tickets(customer_contact_id);
CREATE INDEX IF NOT EXISTS tickets_updated_idx ON tickets(updated_at DESC);
CREATE INDEX IF NOT EXISTS tickets_sla_idx
  ON tickets(first_response_due_at, resolution_due_at);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_type support_message_author NOT NULL,
  author_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  customer_contact_id uuid REFERENCES customer_contacts(id) ON DELETE SET NULL,
  visibility support_message_visibility NOT NULL DEFAULT 'public',
  channel support_channel NOT NULL DEFAULT 'manual',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx
  ON ticket_messages(ticket_id, created_at);

CREATE TABLE IF NOT EXISTS ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_events_ticket_idx
  ON ticket_events(ticket_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_tags (
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES support_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

CREATE INDEX IF NOT EXISTS ticket_tags_tag_idx ON ticket_tags(tag_id);
