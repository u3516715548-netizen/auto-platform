import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { vehicleMediaTypeEnum } from "./enums";
import { tenants } from "./tenants";
import { vehicles } from "./vehicles";

export const vehicleMedia = pgTable(
  "vehicle_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    type: vehicleMediaTypeEnum("type").notNull().default("image"),
    sortOrder: integer("sort_order").notNull().default(0),
    altText: text("alt_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("vehicle_media_tenant_id_idx").on(table.tenantId),
    index("vehicle_media_vehicle_id_idx").on(table.vehicleId),
    index("vehicle_media_created_at_idx").on(table.createdAt),
  ],
);
