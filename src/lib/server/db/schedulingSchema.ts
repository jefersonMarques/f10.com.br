import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
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
