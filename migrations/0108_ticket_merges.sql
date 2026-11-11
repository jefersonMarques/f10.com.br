-- Permissões independentes e inicialmente restritas ao Super Admin.
INSERT INTO permissions (code, name, description)
VALUES
  ('tickets.merge', 'Mesclar tickets', 'Permite mesclar tickets dentro do escopo autorizado, preservando suas origens.'),
  ('tickets.unmerge', 'Desfazer mesclagem de tickets', 'Permite desfazer a associação de tickets sem apagar históricos.')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_code, scope)
SELECT r.id, p.code, 'all'::permission_scope
FROM roles r
JOIN permissions p ON p.code IN ('tickets.merge', 'tickets.unmerge')
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT (role_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;

-- A associação não altera a titularidade, os canais, os dados ou o status original do ticket.
CREATE TABLE IF NOT EXISTS ticket_merge_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  source_ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  merged_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  merged_at timestamptz NOT NULL DEFAULT now(),
  unmerged_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  unmerged_at timestamptz,
  CHECK (primary_ticket_id <> source_ticket_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_merge_links_active_source_unique
  ON ticket_merge_links(source_ticket_id) WHERE unmerged_at IS NULL;
CREATE INDEX IF NOT EXISTS ticket_merge_links_primary_active_idx
  ON ticket_merge_links(primary_ticket_id, merged_at) WHERE unmerged_at IS NULL;
CREATE INDEX IF NOT EXISTS ticket_merge_links_source_history_idx
  ON ticket_merge_links(source_ticket_id, merged_at DESC);
