ALTER TABLE support_chat_entry_options
  ADD COLUMN IF NOT EXISTS show_outside_hours boolean NOT NULL DEFAULT false;
