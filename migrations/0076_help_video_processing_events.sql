CREATE TABLE IF NOT EXISTS "help_video_processing_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "help_video_processing_jobs"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "stage" text NOT NULL,
  "status" text NOT NULL,
  "label" text NOT NULL,
  "detail" text NOT NULL DEFAULT '',
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "help_video_processing_events_job_created_idx"
  ON "help_video_processing_events" ("job_id", "created_at");

INSERT INTO "help_video_processing_events" (
  "job_id",
  "event_type",
  "stage",
  "status",
  "label",
  "detail",
  "metadata",
  "created_at"
)
SELECT
  jobs."id",
  'snapshot',
  jobs."stage",
  jobs."status",
  jobs."progress_label",
  jobs."progress_detail",
  jsonb_build_object(
    'attemptCount', jobs."attempt_count",
    'maxAttempts', jobs."max_attempts"
  ),
  jobs."updated_at"
FROM "help_video_processing_jobs" jobs
WHERE NOT EXISTS (
  SELECT 1
  FROM "help_video_processing_events" events
  WHERE events."job_id" = jobs."id"
);
