import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "$lib/server/db/schema";
import { tickets } from "$lib/server/db/supportSchema";

export const ticketMergeLinks = pgTable(
  "ticket_merge_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    primaryTicketId: uuid("primary_ticket_id").notNull()
      .references(() => tickets.id, { onDelete: "restrict" }),
    sourceTicketId: uuid("source_ticket_id").notNull()
      .references(() => tickets.id, { onDelete: "restrict" }),
    mergedByUserId: uuid("merged_by_user_id")
      .references(() => users.id, { onDelete: "set null" }),
    mergedAt: timestamp("merged_at", { withTimezone: true }).notNull().defaultNow(),
    unmergedByUserId: uuid("unmerged_by_user_id")
      .references(() => users.id, { onDelete: "set null" }),
    unmergedAt: timestamp("unmerged_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("ticket_merge_links_active_source_unique")
      .on(table.sourceTicketId).where(sql`${table.unmergedAt} IS NULL`),
    index("ticket_merge_links_primary_active_idx").on(table.primaryTicketId, table.mergedAt),
  ],
);
