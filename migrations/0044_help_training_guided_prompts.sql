ALTER TABLE help_training_steps
  ADD COLUMN IF NOT EXISTS question text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS primary_action_label text NOT NULL DEFAULT '';
