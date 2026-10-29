-- Diagnóstico da fonte usada para cruzar a planilha com numero_contrato.
-- Não altera vínculos já aplicados.
ALTER TABLE f10_customer_sheet_batches
  ADD COLUMN IF NOT EXISTS api_match_source text NOT NULL DEFAULT 'cache'
    CHECK (api_match_source IN ('live', 'cache', 'unavailable', 'not_configured')),
  ADD COLUMN IF NOT EXISTS api_contract_count integer,
  ADD COLUMN IF NOT EXISTS api_error_code text,
  ADD COLUMN IF NOT EXISTS api_checked_at timestamptz;
