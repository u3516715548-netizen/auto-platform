import {
  integer,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { vehicleStatusEnum } from "./enums";
import { tenants } from "./tenants";

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    status: vehicleStatusEnum("status").notNull().default("draft"),
    slug: text("slug").notNull(),
    vin: text("vin"),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    mileage: integer("mileage").notNull().default(0),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("EUR"),
    specs: jsonb("specs").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("vehicles_tenant_slug_uidx").on(table.tenantId, table.slug),
    index("vehicles_tenant_id_idx").on(table.tenantId),
    index("vehicles_status_idx").on(table.status),
    index("vehicles_created_at_idx").on(table.createdAt),
    index("vehicles_vin_idx").on(table.vin),
  ],
);
