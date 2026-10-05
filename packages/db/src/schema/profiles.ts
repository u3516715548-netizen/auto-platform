import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * App profile. `id` is expected to match Supabase Auth `auth.users.id`.
 * FK toward auth.users is applied in SQL migration when auth schema exists.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
