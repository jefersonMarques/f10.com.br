-- Acesso explícito de pessoas aos contratos no F10 Suporte.
-- Não cria direitos de acesso no sistema acadêmico F10.
CREATE TABLE IF NOT EXISTS customer_contract_access (
  customer_contact_id uuid NOT NULL REFERENCES customer_contacts(id) ON DELETE CASCADE,
  unit_id integer NOT NULL,
  contract_id bigint NOT NULL,
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_contact_id, unit_id, contract_id),
  FOREIGN KEY (unit_id, contract_id)
    REFERENCES f10_customer_contracts(unit_id, contract_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS customer_contract_access_contract_idx
  ON customer_contract_access(unit_id, contract_id, customer_contact_id);

-- Múltiplos contratos envolvidos no ticket; apenas um é principal.
CREATE TABLE IF NOT EXISTS ticket_contract_links (
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  unit_id integer NOT NULL,
  contract_id bigint NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  linked_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, unit_id, contract_id),
  FOREIGN KEY (unit_id, contract_id)
    REFERENCES f10_customer_contracts(unit_id, contract_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_contract_links_primary_unique
  ON ticket_contract_links(ticket_id) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS ticket_contract_links_contract_idx
  ON ticket_contract_links(unit_id, contract_id, ticket_id);

-- Histórico legado é preservado sem alterar o vínculo existente.
INSERT INTO ticket_contract_links(ticket_id, unit_id, contract_id, is_primary)
SELECT ticket_id, unit_id, contract_id, true
FROM ticket_f10_contract_links
ON CONFLICT (ticket_id, unit_id, contract_id) DO NOTHING;

-- Fonte e destino permanecem rastreáveis após a conciliação manual.
CREATE TABLE IF NOT EXISTS customer_contact_merges (
  source_contact_id uuid PRIMARY KEY REFERENCES customer_contacts(id) ON DELETE RESTRICT,
  target_contact_id uuid NOT NULL REFERENCES customer_contacts(id) ON DELETE RESTRICT,
  merged_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  merged_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_contact_id <> target_contact_id)
);
CREATE INDEX IF NOT EXISTS customer_contact_merges_target_idx
  ON customer_contact_merges(target_contact_id);
