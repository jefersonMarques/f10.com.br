-- Estado independente de recuperação de imagens; não toca em artigos, textos ou mídias.
CREATE TABLE IF NOT EXISTS help_movidesk_image_recovery_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  next_request_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
