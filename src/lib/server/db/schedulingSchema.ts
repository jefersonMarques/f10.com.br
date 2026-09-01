import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";
import { customerContacts, tickets } from "$lib/server/db/supportSchema";
import { tasks } from "$lib/server/db/taskSchema";

export const schedulingInvitationStatus = pgEnum("scheduling_invitation_status", [
  "draft",
  "sent",
  "opened",
  "booking",
  "booked",
  "expired",
  "revoked",
  "cancelled",
]);

export const schedulingEventStatus = pgEnum("scheduling_event_status", [
  "confirmed",
  "cancelled",
]);

export const schedulingEventParticipantKind = pgEnum("scheduling_event_participant_kind", [
  "internal",
  "external",
]);

export type SchedulingWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const schedulingAvailabilityProfiles = pgTable("scheduling_availability_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  timeZone: text("time_zone").notNull().default("America/Sao_Paulo"),
  weekdays: jsonb("weekdays").$type<SchedulingWeekday[]>().notNull().default([1, 2, 3, 4, 5]),
  startTime: text("start_time").notNull().default("08:00"),
  endTime: text("end_time").notNull().default("18:00"),
  slotStepMinutes: integer("slot_step_minutes").notNull().default(30),
  minimumNoticeMinutes: integer("minimum_notice_minutes").notNull().default(120),
  bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
  bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
  maxHorizonDays: integer("max_horizon_days").notNull().default(30),
  defaultDurationMinutes: integer("default_duration_minutes").notNull().default(30),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schedulingEvents = pgTable(
  "scheduling_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerUserId: uuid("organizer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    timeZone: text("time_zone").notNull().default("America/Sao_Paulo"),
    status: schedulingEventStatus("status").notNull().default("confirmed"),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    groupId: integer("group_id"),
    groupName: text("group_name"),
    unitId: integer("unit_id"),
    unitName: text("unit_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("scheduling_events_valid_interval", sql`${table.endsAt} > ${table.startsAt}`),
    index("scheduling_events_organizer_start_idx").on(table.organizerUserId, table.startsAt),
    index("scheduling_events_interval_idx").on(table.startsAt, table.endsAt),
    index("scheduling_events_status_idx").on(table.status),
    index("scheduling_events_ticket_idx").on(table.ticketId).where(sql`${table.ticketId} is not null`),
    index("scheduling_events_task_idx").on(table.taskId).where(sql`${table.taskId} is not null`),
  ],
);

export const schedulingEventParticipants = pgTable(
  "scheduling_event_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => schedulingEvents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    customerContactId: uuid("customer_contact_id").references(() => customerContacts.id, { onDelete: "set null" }),
    name: text("name").notNull().default(""),
    email: text("email").notNull().default(""),
    kind: schedulingEventParticipantKind("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "scheduling_event_participants_identity_check",
      sql`(${table.kind} = 'internal' and ${table.userId} is not null) or (${table.kind} = 'external' and (${table.customerContactId} is not null or length(trim(${table.email})) > 0))`,
    ),
    index("scheduling_event_participants_event_idx").on(table.eventId),
    index("scheduling_event_participants_user_idx")
      .on(table.userId, table.eventId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex("scheduling_event_participants_internal_unique")
      .on(table.eventId, table.userId)
      .where(sql`${table.kind} = 'internal' and ${table.userId} is not null`),
    uniqueIndex("scheduling_event_participants_external_email_unique")
      .on(table.eventId, sql`lower(${table.email})`)
      .where(sql`${table.kind} = 'external' and length(trim(${table.email})) > 0`),
  ],
);

export const schedulingEventGoogleCalendarLinks = pgTable(
  "scheduling_event_google_calendar_links",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => schedulingEvents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    googleCalendarId: text("google_calendar_id").notNull().default("primary"),
    googleEventId: text("google_event_id"),
    googleIcalUid: text("google_ical_uid"),
    googleHtmlLink: text("google_html_link"),
    googleMeetUrl: text("google_meet_url"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastSyncError: text("last_sync_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
    index("scheduling_event_google_links_user_idx").on(table.userId),
    index("scheduling_event_google_links_event_idx")
      .on(table.userId, table.googleCalendarId, table.googleEventId)
      .where(sql`${table.googleEventId} is not null`),
  ],
);

export const schedulingInvitations = pgTable(
  "scheduling_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    customerContactId: uuid("customer_contact_id").references(() => customerContacts.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    title: text("title").notNull(),
    hostUserId: uuid("host_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    durationMinutes: integer("duration_minutes").notNull(),
    timeZone: text("time_zone").notNull(),
    workingWeekdays: jsonb("working_weekdays").$type<SchedulingWeekday[]>().notNull().default([]),
    workingStartTime: text("working_start_time").notNull(),
    workingEndTime: text("working_end_time").notNull(),
    slotStepMinutes: integer("slot_step_minutes").notNull(),
    minimumNoticeMinutes: integer("minimum_notice_minutes").notNull(),
    bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
    bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
    dateRangeStart: date("date_range_start").notNull(),
    dateRangeEnd: date("date_range_end").notNull(),
    addGoogleMeet: boolean("add_google_meet").notNull().default(false),
    status: schedulingInvitationStatus("status").notNull().default("draft"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    bookingStartedAt: timestamp("booking_started_at", { withTimezone: true }),
    bookedAt: timestamp("booked_at", { withTimezone: true }),
    selectedStartAt: timestamp("selected_start_at", { withTimezone: true }),
    selectedEndAt: timestamp("selected_end_at", { withTimezone: true }),
    googleCalendarId: text("google_calendar_id").notNull().default("primary"),
    googleEventId: text("google_event_id"),
    googleIcalUid: text("google_ical_uid"),
    googleMeetUrl: text("google_meet_url"),
    eventId: uuid("event_id").references(() => schedulingEvents.id, { onDelete: "set null" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    groupId: integer("group_id"),
    groupName: text("group_name"),
    unitId: integer("unit_id"),
    unitName: text("unit_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("scheduling_invitations_token_unique").on(table.tokenHash),
    uniqueIndex("scheduling_invitations_event_unique")
      .on(table.eventId)
      .where(sql`${table.eventId} is not null`),
    index("scheduling_invitations_creator_idx").on(table.createdByUserId, table.createdAt),
    index("scheduling_invitations_host_idx").on(table.hostUserId, table.status, table.dateRangeStart, table.dateRangeEnd),
    index("scheduling_invitations_customer_idx").on(table.customerContactId, table.createdAt),
  ],
);

export const schedulingRateLimits = pgTable(
  "scheduling_rate_limits",
  {
    key: text("key").primaryKey(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    requestCount: integer("request_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("scheduling_rate_limits_updated_idx").on(table.updatedAt)],
);
