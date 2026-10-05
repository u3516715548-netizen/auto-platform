import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { leadStatusEnum } from "./enums";
import { profiles } from "./profiles";
import { tenants } from "./tenants";
import { vehicles } from "./vehicles";

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    message: text("message"),
    source: text("source").notNull().default("storefront"),
    status: leadStatusEnum("status").notNull().default("new"),
    assignedTo: uuid("assigned_to").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_tenant_id_idx").on(table.tenantId),
    index("leads_vehicle_id_idx").on(table.vehicleId),
    index("leads_status_idx").on(table.status),
    index("leads_created_at_idx").on(table.createdAt),
  ],
);
