import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";
import { tickets } from "$lib/server/db/supportSchema";
import { tasks } from "$lib/server/db/taskSchema";

export type SupportAgentManualStatus = "online" | "busy" | "offline";

export const supportAgentPresence = pgTable(
  "support_agent_presence",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    manualStatus: text("manual_status")
      .$type<SupportAgentManualStatus>()
      .notNull()
      .default("offline"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("support_agent_presence_activity_idx").on(
      table.manualStatus,
      table.lastActivityAt,
    ),
  ],
);

export const supportChatRoutingMembers = pgTable(
  "support_chat_routing_members",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    lastAssignedAt: timestamp("last_assigned_at", { withTimezone: true }),
    addedBy: uuid("added_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("support_chat_routing_members_enabled_idx").on(
      table.enabled,
      table.lastAssignedAt,
    ),
  ],
);

export const supportTicketRoutingMembers = pgTable(
  "support_ticket_routing_members",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    lastAssignedAt: timestamp("last_assigned_at", { withTimezone: true }),
    addedBy: uuid("added_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("support_ticket_routing_members_enabled_idx").on(
      table.enabled,
      table.lastAssignedAt,
    ),
  ],
);

export const ticketTaskLinks = pgTable(
  "ticket_task_links",
  {
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.ticketId, table.taskId] }),
    index("ticket_task_links_ticket_idx").on(table.ticketId, table.createdAt),
    index("ticket_task_links_task_idx").on(table.taskId, table.createdAt),
  ],
);
