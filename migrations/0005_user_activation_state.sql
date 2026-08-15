ALTER TABLE users
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

UPDATE users
SET activated_at = COALESCE(activated_at, created_at)
WHERE status = 'active';
