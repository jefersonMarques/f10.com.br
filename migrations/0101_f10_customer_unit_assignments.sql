-- Vínculos manuais de pessoas autenticadas no F10 às unidades comerciais da planilha.
-- Grupo é identificado pelo grupo_id do login = source_group_id da planilha.
-- IMPORTANTE: esta tabela é administrativa e NÃO concede acesso ao portal.
CREATE TABLE IF NOT EXISTS customer_f10_unit_assignments (
  legacy_user_id text NOT NULL REFERENCES customer_f10_identities(legacy_user_id) ON DELETE CASCADE,
  customer_unit_id uuid NOT NULL REFERENCES customer_units(id) ON DELETE CASCADE,
  function_role text NOT NULL CHECK (function_role IN (
    'responsavel', 'gestor', 'financeiro', 'comercial', 'operacional', 'contato'
  )),
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (legacy_user_id, customer_unit_id)
);
CREATE INDEX IF NOT EXISTS customer_f10_unit_assignments_unit_idx
  ON customer_f10_unit_assignments(customer_unit_id);
