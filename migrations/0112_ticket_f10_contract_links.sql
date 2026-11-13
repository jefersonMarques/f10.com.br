-- Vincula o ticket ao contrato efetivamente selecionado pelo operador.
-- A identidade é o ID estável da API, sem simular contexto legado.
CREATE TABLE IF NOT EXISTS ticket_f10_contract_links (
  ticket_id uuid PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
  unit_id integer NOT NULL,
  contract_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (unit_id, contract_id)
    REFERENCES f10_customer_contracts(unit_id, contract_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ticket_f10_contract_links_contract_idx
  ON ticket_f10_contract_links(unit_id, contract_id);
