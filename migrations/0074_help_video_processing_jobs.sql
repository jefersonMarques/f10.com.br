CREATE TABLE IF NOT EXISTS "help_video_processing_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "content_id" uuid NOT NULL REFERENCES "help_contents"("id") ON DELETE CASCADE,
  "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "source_kind" text NOT NULL,
  "source_asset_id" uuid REFERENCES "help_assets"("id") ON DELETE SET NULL,
  "source_storage_key" text,
  "source_file_name" text NOT NULL DEFAULT 'video.mp4',
  "source_mime_type" text NOT NULL DEFAULT 'video/mp4',
  "status" text NOT NULL DEFAULT 'queued',
  "stage" text NOT NULL DEFAULT 'queued',
  "progress_label" text NOT NULL DEFAULT 'Na fila',
  "progress_detail" text NOT NULL DEFAULT '',
  "attempt_count" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 5,
  "next_attempt_at" timestamptz,
  "heartbeat_at" timestamptz,
  "lease_expires_at" timestamptz,
  "checkpoint" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "result" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "last_error_code" text,
  "last_error_message" text,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "help_video_processing_jobs_source_kind_check"
    CHECK ("source_kind" IN ('current', 'upload')),
  CONSTRAINT "help_video_processing_jobs_status_check"
    CHECK ("status" IN ('queued', 'running', 'retry_waiting', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS "help_video_processing_jobs_content_idx"
  ON "help_video_processing_jobs" ("content_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "help_video_processing_jobs_status_idx"
  ON "help_video_processing_jobs" ("status", "next_attempt_at", "created_at");

CREATE INDEX IF NOT EXISTS "help_video_processing_jobs_lease_idx"
  ON "help_video_processing_jobs" ("status", "lease_expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "help_video_processing_jobs_content_active_unique"
  ON "help_video_processing_jobs" ("content_id")
  WHERE "status" IN ('queued', 'running', 'retry_waiting');

CREATE TABLE IF NOT EXISTS "help_video_processing_parts" (
  "job_id" uuid NOT NULL REFERENCES "help_video_processing_jobs"("id") ON DELETE CASCADE,
  "part_index" integer NOT NULL,
  "segment_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "completed_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("job_id", "part_index")
);

CREATE INDEX IF NOT EXISTS "help_video_processing_parts_job_idx"
  ON "help_video_processing_parts" ("job_id", "part_index");
