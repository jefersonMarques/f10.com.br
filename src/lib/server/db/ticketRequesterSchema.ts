import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";
import { customerContacts, tickets } from "$lib/server/db/supportSchema";

export const ticketRequesterProfiles = pgTable(
  "ticket_requester_profiles",
  {
    ticketId: uuid("ticket_id").primaryKey()
      .references(() => tickets.id, { onDelete: "cascade" }),
    customerContactId: uuid("customer_contact_id")
      .references(() => customerContacts.id, { onDelete: "set null" }),
    displayName: text("display_name"),
    displayEmail: text("display_email"),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ticket_requester_profiles_contact_idx").on(table.customerContactId),
  ],
);
