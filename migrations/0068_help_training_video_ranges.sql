-- Cada slide da trilha passa a referenciar uma faixa do vídeo original.
-- 0 em video_end_seconds preserva compatibilidade com trilhas antigas até regeneração.

ALTER TABLE help_training_steps
  ADD COLUMN IF NOT EXISTS video_end_seconds integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'help_training_steps_video_end_seconds_check'
  ) THEN
    ALTER TABLE help_training_steps
      ADD CONSTRAINT help_training_steps_video_end_seconds_check
      CHECK (
        video_end_seconds >= 0
        AND video_end_seconds <= 86400
        AND (video_end_seconds = 0 OR video_end_seconds > video_start_seconds)
      );
  END IF;
END $$;
