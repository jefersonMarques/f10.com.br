-- Trilhas passam a ser uma camada de execução sobre conteúdo publicado.
-- O produto ainda não possui trilhas oficiais em produção; os rascunhos de teste
-- são descartados para permitir o novo vínculo obrigatório sem compatibilidade legada.

DELETE FROM help_training_paths;

ALTER TABLE help_training_paths
  ADD COLUMN IF NOT EXISTS source_content_id uuid,
  ADD COLUMN IF NOT EXISTS source_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_publication_snapshot jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'help_training_paths_source_content_fk'
  ) THEN
    ALTER TABLE help_training_paths
      ADD CONSTRAINT help_training_paths_source_content_fk
      FOREIGN KEY (source_content_id)
      REFERENCES help_contents(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE help_training_paths
  ALTER COLUMN source_content_id SET NOT NULL,
  ALTER COLUMN source_published_at SET NOT NULL,
  ALTER COLUMN source_publication_snapshot SET NOT NULL;

CREATE INDEX IF NOT EXISTS help_training_paths_source_content_idx
  ON help_training_paths(source_content_id, status);

ALTER TABLE help_training_steps
  ADD COLUMN IF NOT EXISTS source_content_step_id uuid,
  ADD COLUMN IF NOT EXISTS video_start_seconds integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'help_training_steps_video_start_seconds_check'
  ) THEN
    ALTER TABLE help_training_steps
      ADD CONSTRAINT help_training_steps_video_start_seconds_check
      CHECK (video_start_seconds >= 0 AND video_start_seconds <= 86400);
  END IF;
END $$;
