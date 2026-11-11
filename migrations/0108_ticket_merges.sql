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

-- Atualiza a atividade do principal sem alterar status, cliente ou prazo dos tickets de origem.
CREATE OR REPLACE FUNCTION f10_propagate_merged_ticket_activity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.updated_at <= OLD.updated_at THEN
    RETURN NEW;
  END IF;

  WITH RECURSIVE ancestors AS (
    SELECT primary_ticket_id AS ticket_id
    FROM ticket_merge_links
    WHERE source_ticket_id = NEW.id AND unmerged_at IS NULL
    UNION
    SELECT link.primary_ticket_id
    FROM ticket_merge_links link
    INNER JOIN ancestors parent ON link.source_ticket_id = parent.ticket_id
    WHERE link.unmerged_at IS NULL
  )
  UPDATE tickets
  SET updated_at = NEW.updated_at
  WHERE id IN (SELECT ticket_id FROM ancestors)
    AND updated_at < NEW.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticket_merge_activity_sync ON tickets;
CREATE TRIGGER ticket_merge_activity_sync
  AFTER UPDATE OF updated_at ON tickets
  FOR EACH ROW EXECUTE FUNCTION f10_propagate_merged_ticket_activity();

-- Chats convertidos continuam atualizando a atividade do ticket associado.
CREATE OR REPLACE FUNCTION f10_sync_chat_merged_ticket_activity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE tickets
  SET updated_at = clock_timestamp()
  WHERE id = (
    SELECT ticket_id FROM web_chat_sessions WHERE id = NEW.session_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS web_chat_merged_ticket_activity ON web_chat_messages;
CREATE TRIGGER web_chat_merged_ticket_activity
  AFTER INSERT ON web_chat_messages
  FOR EACH ROW EXECUTE FUNCTION f10_sync_chat_merged_ticket_activity();
