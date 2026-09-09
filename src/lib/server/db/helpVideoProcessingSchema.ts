import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";
import {
  helpAssets,
  helpContents,
} from "$lib/server/db/structuredHelpSchema";

export type HelpVideoProcessingJobStatus =
  | "queued"
  | "running"
  | "retry_waiting"
  | "completed"
  | "failed"
  | "cancelled";

export type HelpVideoProcessingSourceKind = "current" | "upload";

export const helpVideoProcessingJobs = pgTable(
  "help_video_processing_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => helpContents.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sourceKind: text("source_kind")
      .$type<HelpVideoProcessingSourceKind>()
      .notNull(),
    sourceAssetId: uuid("source_asset_id").references(() => helpAssets.id, {
      onDelete: "set null",
    }),
    sourceStorageKey: text("source_storage_key"),
    sourceFileName: text("source_file_name").notNull().default("video.mp4"),
    sourceMimeType: text("source_mime_type").notNull().default("video/mp4"),
    status: text("status")
      .$type<HelpVideoProcessingJobStatus>()
      .notNull()
      .default("queued"),
    stage: text("stage").notNull().default("queued"),
    progressLabel: text("progress_label").notNull().default("Na fila"),
    progressDetail: text("progress_detail").notNull().default(""),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    checkpoint: jsonb("checkpoint")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    result: jsonb("result")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("help_video_processing_jobs_content_idx").on(
      table.contentId,
      table.createdAt,
    ),
    index("help_video_processing_jobs_status_idx").on(
      table.status,
      table.nextAttemptAt,
      table.createdAt,
    ),
    index("help_video_processing_jobs_lease_idx").on(
      table.status,
      table.leaseExpiresAt,
    ),
  ],
);

export const helpVideoProcessingParts = pgTable(
  "help_video_processing_parts",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => helpVideoProcessingJobs.id, { onDelete: "cascade" }),
    partIndex: integer("part_index").notNull(),
    segmentIds: jsonb("segment_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.jobId, table.partIndex] }),
    index("help_video_processing_parts_job_idx").on(
      table.jobId,
      table.partIndex,
    ),
  ],
);
