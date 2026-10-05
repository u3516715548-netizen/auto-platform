import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { reservationStatusEnum } from "./enums";
import { profiles } from "./profiles";
import { tenants } from "./tenants";
import { vehicles } from "./vehicles";

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    status: reservationStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reservations_tenant_id_idx").on(table.tenantId),
    index("reservations_vehicle_id_idx").on(table.vehicleId),
    index("reservations_status_idx").on(table.status),
    index("reservations_created_at_idx").on(table.createdAt),
    uniqueIndex("reservations_tenant_idempotency_uidx").on(table.tenantId, table.idempotencyKey),
    // One active reservation per vehicle (ACID guard).
    uniqueIndex("reservations_one_active_per_vehicle_uidx")
      .on(table.vehicleId)
      .where(sql`${table.status} = 'active'`),
  ],
);
