import { index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";
import { tasks } from "$lib/server/db/taskSchema";

export type TaskMessageOrigin = {
  sourceKind: "chat" | "ticket";
  messageId: string;
  ticketId: string | null;
  requestKey: string;
};

export const supportMessageTaskLinks = pgTable(
  "support_message_task_links",
  {
    sourceKind: text("source_kind").$type<"chat" | "ticket">().notNull(),
    messageId: uuid("message_id").notNull(),
    taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    requestKey: uuid("request_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sourceKind, table.messageId, table.taskId] }),
    uniqueIndex("support_message_task_links_request_key_unique").on(table.requestKey),
    index("support_message_task_links_message_idx").on(table.sourceKind, table.messageId),
    index("support_message_task_links_task_idx").on(table.taskId),
  ],
);
