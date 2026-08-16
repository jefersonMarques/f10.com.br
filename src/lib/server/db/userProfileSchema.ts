import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  avatarKey: text("avatar_key"),
  avatarContentType: text("avatar_content_type"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
