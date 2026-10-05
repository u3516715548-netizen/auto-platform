import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { membershipRoleEnum } from "./enums";
import { profiles } from "./profiles";
import { tenants } from "./tenants";

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("memberships_tenant_profile_uidx").on(table.tenantId, table.profileId),
    index("memberships_tenant_id_idx").on(table.tenantId),
    index("memberships_profile_id_idx").on(table.profileId),
  ],
);
