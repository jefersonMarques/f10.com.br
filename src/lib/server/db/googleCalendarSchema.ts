import { boolean, index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";
import { tasks } from "$lib/server/db/taskSchema";

export const googleCalendarConnections = pgTable("google_calendar_connections", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  googleEmail: text("google_email").notNull().default(""),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  scope: text("scope").notNull().default(""),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskGoogleCalendarLinks = pgTable(
  "task_google_calendar_links",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    googleCalendarId: text("google_calendar_id").notNull().default("primary"),
    googleEventId: text("google_event_id").notNull(),
    googleHtmlLink: text("google_html_link"),
    allDay: boolean("all_day").notNull().default(true),
    startTime: text("start_time"),
    endTime: text("end_time"),
    timeZone: text("time_zone").notNull().default("UTC"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastSyncError: text("last_sync_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.userId] }),
    index("task_google_calendar_links_user_idx").on(table.userId),
    index("task_google_calendar_links_event_idx").on(table.userId, table.googleEventId),
  ],
);
