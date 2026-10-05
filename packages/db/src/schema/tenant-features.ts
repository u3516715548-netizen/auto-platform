import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const tenantFeatures = pgTable(
  "tenant_features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    config: jsonb("config").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tenant_features_tenant_key_uidx").on(table.tenantId, table.featureKey),
    index("tenant_features_tenant_id_idx").on(table.tenantId),
  ],
);
