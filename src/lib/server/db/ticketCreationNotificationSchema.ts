import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tickets } from "$lib/server/db/supportSchema";

export const ticketCreationNotifications = pgTable("ticket_creation_notifications", {
  ticketId: uuid("ticket_id").primaryKey()
    .references(() => tickets.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  status: text("status").$type<"sending" | "sent" | "failed" | "skipped">().notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  errorCode: text("error_code"),
});
