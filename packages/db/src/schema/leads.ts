import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { leadNotificationStatusEnum, leadStatusEnum } from "./enums";
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
    /** Explicit GDPR-style consent timestamp (set server-side on accept). */
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    /** Consent copy version; default v1. */
    consentVersion: text("consent_version").default("v1"),
    /** Email delivery outcome — independent of CRM `status`. */
    notificationStatus: leadNotificationStatusEnum("notification_status")
      .notNull()
      .default("pending"),
    notificationAttemptedAt: timestamp("notification_attempted_at", { withTimezone: true }),
    /** Short internal code only — never PII or message body. */
    notificationReason: text("notification_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_tenant_id_idx").on(table.tenantId),
    index("leads_vehicle_id_idx").on(table.vehicleId),
    index("leads_status_idx").on(table.status),
    index("leads_created_at_idx").on(table.createdAt),
    index("leads_notification_status_idx").on(table.notificationStatus),
  ],
);
