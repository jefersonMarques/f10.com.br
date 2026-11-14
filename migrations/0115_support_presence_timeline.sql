-- Registro de sessões de presença do Helpdesk.
-- O histórico inicia após a implantação, sem inferir sessões anteriores.
CREATE TABLE IF NOT EXISTS support_presence_intervals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('online', 'busy')),
  started_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL,
  ended_at timestamptz,
  close_reason text CHECK (close_reason IN ('manual', 'away', 'status')),
  CHECK (last_activity_at >= started_at),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS support_presence_intervals_open_idx
  ON support_presence_intervals(user_id) WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS support_presence_intervals_range_idx
  ON support_presence_intervals(user_id, started_at, ended_at);
