CREATE TABLE IF NOT EXISTS ai_provider_credentials (
  provider text PRIMARY KEY,
  encrypted_secret text NOT NULL,
  last_tested_at timestamptz,
  last_test_status text,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_provider_credentials_test_status_check
    CHECK (last_test_status IS NULL OR last_test_status IN ('ok', 'error'))
);

INSERT INTO operations_settings (key, value, updated_at)
SELECT
  'ai_runtime_policy',
  jsonb_build_object(
    'maxRunsPerConversation',
    COALESCE(NULLIF(value->>'aiMaxRunsPerConversation', '')::integer, 6),
    'dailyTokenBudget',
    COALESCE(NULLIF(value->>'aiDailyTokenBudget', '')::integer, 100000),
    'maxOutputTokens',
    COALESCE(NULLIF(value->>'aiMaxOutputTokens', '')::integer, 500)
  ),
  now()
FROM operations_settings
WHERE key = 'support_routing'
ON CONFLICT (key) DO NOTHING;
