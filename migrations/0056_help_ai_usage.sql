CREATE TABLE IF NOT EXISTS help_ai_usage_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  operation text NOT NULL,
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  audio_seconds integer,
  estimated_cost_usd_micros bigint NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  failure_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_ai_usage_runs_created_idx
  ON help_ai_usage_runs (created_at);
CREATE INDEX IF NOT EXISTS help_ai_usage_runs_operation_idx
  ON help_ai_usage_runs (operation, created_at);
CREATE INDEX IF NOT EXISTS help_ai_usage_runs_model_idx
  ON help_ai_usage_runs (model, created_at);
CREATE INDEX IF NOT EXISTS help_ai_usage_runs_status_idx
  ON help_ai_usage_runs (status, created_at);
