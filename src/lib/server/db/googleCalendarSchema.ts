import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";
import { taskProjects, tasks } from "$lib/server/db/taskSchema";
import { tickets } from "$lib/server/db/supportSchema";

export type TaskGoogleCalendarAttendee = {
  email: string;
  name: string;
  userId: string | null;
  optional: boolean;
};

export type GoogleCalendarImportMode = "hidden" | "view_only" | "task";
export type GoogleCalendarSyncDirection = "f10_to_google" | "google_to_f10" | "bidirectional";
export type GoogleCalendarSyncSource = "f10" | "google";

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

export const googleCalendarPreferences = pgTable("google_calendar_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  targetCalendarId: text("target_calendar_id").notNull().default("primary"),
  syncTasksToGoogle: boolean("sync_tasks_to_google").notNull().default(false),
  syncTicketsToGoogle: boolean("sync_tickets_to_google").notNull().default(false),
  syncSchedulingToGoogle: boolean("sync_scheduling_to_google").notNull().default(false),
  syncGoogleChangesToF10: boolean("sync_google_changes_to_f10").notNull().default(false),
  lastSyncStartedAt: timestamp("last_sync_started_at", { withTimezone: true }),
  lastSyncCompletedAt: timestamp("last_sync_completed_at", { withTimezone: true }),
  lastSyncError: text("last_sync_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const googleCalendarSources = pgTable(
  "google_calendar_sources",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    calendarId: text("calendar_id").notNull(),
    calendarName: text("calendar_name").notNull().default(""),
    accessRole: text("access_role").notNull().default("reader"),
    isPrimary: boolean("is_primary").notNull().default(false),
    visibleInF10: boolean("visible_in_f10").notNull().default(false),
    importMode: text("import_mode").$type<GoogleCalendarImportMode>().notNull().default("view_only"),
    importProjectId: uuid("import_project_id").references(() => taskProjects.id, { onDelete: "set null" }),
    importAssigneeId: uuid("import_assignee_id").references(() => users.id, { onDelete: "set null" }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.calendarId] }),
    index("google_calendar_sources_visible_idx").on(table.userId, table.visibleInF10),
  ],
);

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
    googleIcalUid: text("google_ical_uid"),
    googleHtmlLink: text("google_html_link"),
    googleMeetEnabled: boolean("google_meet_enabled").notNull().default(false),
    googleMeetUrl: text("google_meet_url"),
    allDay: boolean("all_day").notNull().default(true),
    startTime: text("start_time"),
    endTime: text("end_time"),
    timeZone: text("time_zone").notNull().default("UTC"),
    eventDetailsManaged: boolean("event_details_managed").notNull().default(false),
    location: text("location").notNull().default(""),
    reminderMinutes: integer("reminder_minutes"),
    attendees: jsonb("attendees")
      .$type<TaskGoogleCalendarAttendee[]>()
      .notNull()
      .default([]),
    syncDirection: text("sync_direction")
      .$type<GoogleCalendarSyncDirection>()
      .notNull()
      .default("f10_to_google"),
    autoManaged: boolean("auto_managed").notNull().default(false),
    importedFromGoogle: boolean("imported_from_google").notNull().default(false),
    googleUpdatedAt: timestamp("google_updated_at", { withTimezone: true }),
    lastSyncSource: text("last_sync_source")
      .$type<GoogleCalendarSyncSource>()
      .notNull()
      .default("f10"),
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

export const ticketGoogleCalendarLinks = pgTable(
  "ticket_google_calendar_links",
  {
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    googleCalendarId: text("google_calendar_id").notNull().default("primary"),
    googleEventId: text("google_event_id").notNull(),
    googleIcalUid: text("google_ical_uid"),
    googleHtmlLink: text("google_html_link"),
    autoManaged: boolean("auto_managed").notNull().default(true),
    googleUpdatedAt: timestamp("google_updated_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastSyncError: text("last_sync_error"),
    lastSyncSource: text("last_sync_source")
      .$type<GoogleCalendarSyncSource>()
      .notNull()
      .default("f10"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.ticketId, table.userId] }),
    index("ticket_google_calendar_links_user_idx").on(table.userId),
    index("ticket_google_calendar_links_event_idx").on(table.userId, table.googleCalendarId, table.googleEventId),
  ],
);
