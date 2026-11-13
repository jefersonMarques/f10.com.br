-- Cadastro do titular/responsável obtido pelo titular_id do contrato na API F10.
-- Esta tabela não cria contatos, organizações ou permissões de portal.
CREATE TABLE IF NOT EXISTS f10_customer_holder_profiles (
  unit_id integer NOT NULL CHECK (unit_id > 0),
  holder_id bigint NOT NULL CHECK (holder_id > 0),
  name text,
  email text,
  phone text,
  mobile text,
  document text,
  postal_code text,
  street text,
  neighborhood text,
  city text,
  state text,
  address_complement text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'synced', 'failed')),
  error_code text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz,
  PRIMARY KEY (unit_id, holder_id)
);
CREATE INDEX IF NOT EXISTS f10_customer_holder_sync_idx
  ON f10_customer_holder_profiles(unit_id, status, next_attempt_at);
CREATE INDEX IF NOT EXISTS f10_customer_holder_name_idx
  ON f10_customer_holder_profiles(unit_id, lower(name))
  WHERE name IS NOT NULL;
