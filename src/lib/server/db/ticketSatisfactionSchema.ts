import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { customerContacts, tickets } from "$lib/server/db/supportSchema";

export const ticketSatisfactionSurveys = pgTable(
  "ticket_satisfaction_surveys",
  {
    ticketId: uuid("ticket_id")
      .primaryKey()
      .references(() => tickets.id, { onDelete: "cascade" }),
    customerContactId: uuid("customer_contact_id")
      .notNull()
      .references(() => customerContacts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    score: integer("score"),
    comment: text("comment"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("ticket_satisfaction_token_unique").on(table.tokenHash),
    index("ticket_satisfaction_customer_idx").on(table.customerContactId, table.requestedAt),
    index("ticket_satisfaction_pending_idx").on(table.expiresAt),
  ],
);
