DO $$ BEGIN
  CREATE TYPE support_ai_resolution AS ENUM ('answered', 'escalate', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS support_ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  search_event_id uuid REFERENCES help_search_events(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text NOT NULL DEFAULT '',
  resolution support_ai_resolution NOT NULL,
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL,
  provider_response_id text,
  source_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalation_reason text NOT NULL DEFAULT '',
  failure_code text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_ai_runs_created_idx
  ON support_ai_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS support_ai_runs_resolution_idx
  ON support_ai_runs(resolution, created_at DESC);
CREATE INDEX IF NOT EXISTS support_ai_runs_search_event_idx
  ON support_ai_runs(search_event_id);
CREATE INDEX IF NOT EXISTS support_ai_runs_ticket_idx
  ON support_ai_runs(ticket_id)
  WHERE ticket_id IS NOT NULL;
