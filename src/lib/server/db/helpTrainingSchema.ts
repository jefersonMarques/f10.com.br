import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { helpContentStatus, helpAssets } from "$lib/server/db/structuredHelpSchema";
import { supportQueues, tickets } from "$lib/server/db/supportSchema";
import { users } from "$lib/server/db/schema";

export const helpTrainingPaths = pgTable(
  "help_training_paths",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    audience: text("audience").notNull().default(""),
    description: text("description").notNull().default(""),
    welcomeMessage: text("welcome_message").notNull().default(""),
    status: helpContentStatus("status").notNull().default("draft"),
    currentVersion: integer("current_version").notNull().default(0),
    supportQueueId: uuid("support_queue_id").references(() => supportQueues.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_training_paths_slug_unique").on(table.slug),
    index("help_training_paths_status_idx").on(table.status, table.updatedAt),
  ],
);

export const helpTrainingSteps = pgTable(
  "help_training_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pathId: uuid("path_id")
      .notNull()
      .references(() => helpTrainingPaths.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    instruction: text("instruction").notNull().default(""),
    expectedResult: text("expected_result").notNull().default(""),
    successMessage: text("success_message").notNull().default(""),
    estimatedSeconds: integer("estimated_seconds").notNull().default(45),
    sortOrder: integer("sort_order").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_training_steps_order_unique").on(table.pathId, table.sortOrder),
    index("help_training_steps_path_idx").on(table.pathId, table.sortOrder),
  ],
);

export const helpTrainingStepMedia = pgTable(
  "help_training_step_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: uuid("step_id")
      .notNull()
      .references(() => helpTrainingSteps.id, { onDelete: "cascade" }),
    mediaType: text("media_type").notNull(),
    assetId: uuid("asset_id").references(() => helpAssets.id, { onDelete: "restrict" }),
    sourceUrl: text("source_url"),
    altText: text("alt_text").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_training_step_media_order_unique").on(table.stepId, table.sortOrder),
    index("help_training_step_media_step_idx").on(table.stepId, table.sortOrder),
    index("help_training_step_media_asset_idx").on(table.assetId),
  ],
);

export const helpTrainingFailureReasons = pgTable(
  "help_training_failure_reasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: uuid("step_id")
      .notNull()
      .references(() => helpTrainingSteps.id, { onDelete: "cascade" }),
    reasonKey: text("reason_key").notNull(),
    label: text("label").notNull(),
    recoveryMessage: text("recovery_message").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_training_failure_reason_key_unique").on(table.stepId, table.reasonKey),
    uniqueIndex("help_training_failure_reason_order_unique").on(table.stepId, table.sortOrder),
    index("help_training_failure_reasons_step_idx").on(table.stepId, table.sortOrder),
  ],
);

export type HelpTrainingSnapshot = {
  pathId: string;
  slug: string;
  title: string;
  audience: string;
  description: string;
  welcomeMessage: string;
  version: number;
  steps: Array<{
    id: string;
    title: string;
    instruction: string;
    expectedResult: string;
    successMessage: string;
    estimatedSeconds: number;
    images: Array<{ assetId: string; altText: string }>;
    videoUrl: string | null;
    failureReasons: Array<{
      key: string;
      label: string;
      recoveryMessage: string;
    }>;
  }>;
};

export const helpTrainingVersions = pgTable(
  "help_training_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pathId: uuid("path_id")
      .notNull()
      .references(() => helpTrainingPaths.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<HelpTrainingSnapshot>().notNull(),
    publishedBy: uuid("published_by").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_training_versions_path_version_unique").on(table.pathId, table.version),
    index("help_training_versions_path_idx").on(table.pathId, table.version),
  ],
);

export const helpTrainingInvites = pgTable(
  "help_training_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pathId: uuid("path_id")
      .notNull()
      .references(() => helpTrainingPaths.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => helpTrainingVersions.id, { onDelete: "restrict" }),
    participantName: text("participant_name").notNull(),
    participantEmail: text("participant_email").notNull(),
    organizationName: text("organization_name").notNull().default(""),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_training_invites_token_unique").on(table.tokenHash),
    index("help_training_invites_path_idx").on(table.pathId, table.createdAt),
    index("help_training_invites_email_idx").on(table.participantEmail),
  ],
);

export const helpTrainingSessions = pgTable(
  "help_training_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => helpTrainingInvites.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    currentStepIndex: integer("current_step_index").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    supportTicketId: uuid("support_ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_training_sessions_invite_unique").on(table.inviteId),
    uniqueIndex("help_training_sessions_token_unique").on(table.sessionTokenHash),
    index("help_training_sessions_activity_idx").on(table.lastActivityAt),
  ],
);

export const helpTrainingStepProgress = pgTable(
  "help_training_step_progress",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => helpTrainingSessions.id, { onDelete: "cascade" }),
    stepKey: text("step_key").notNull(),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    failureReasonKey: text("failure_reason_key"),
    failureDetail: text("failure_detail").notNull().default(""),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    helpTicketId: uuid("help_ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.stepKey] }),
    index("help_training_step_progress_status_idx").on(table.status, table.updatedAt),
  ],
);

export const helpTrainingEvents = pgTable(
  "help_training_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => helpTrainingSessions.id, { onDelete: "cascade" }),
    stepKey: text("step_key"),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("help_training_events_session_idx").on(table.sessionId, table.createdAt),
    index("help_training_events_type_idx").on(table.eventType, table.createdAt),
  ],
);
