ALTER TABLE "help_video_processing_jobs"
  ADD COLUMN IF NOT EXISTS "operation" text NOT NULL DEFAULT 'regenerate';

ALTER TABLE "help_video_processing_jobs"
  ADD COLUMN IF NOT EXISTS "import_external_id" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'help_video_processing_jobs_operation_check'
  ) THEN
    ALTER TABLE "help_video_processing_jobs"
      ADD CONSTRAINT "help_video_processing_jobs_operation_check"
      CHECK ("operation" IN ('regenerate', 'import'));
  END IF;
END;
$;

CREATE INDEX IF NOT EXISTS "help_video_processing_jobs_operation_status_idx"
  ON "help_video_processing_jobs" ("operation", "status", "updated_at");
