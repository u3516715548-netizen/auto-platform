import {
  index,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  financeApplicantTypeEnum,
  financeApplicationStatusEnum,
} from "./enums";
import { leads } from "./leads";
import { tenants } from "./tenants";
import { vehicles } from "./vehicles";

/**
 * Etapa 19 — storefront finance applications.
 * Notification delivery is tracked on the companion `leads` row (source=finance), not here.
 */
export const financeApplications = pgTable(
  "finance_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    /** Companion lead created atomically on submit (source=finance). */
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    applicantType: financeApplicantTypeEnum("applicant_type").notNull(),
    fullName: text("full_name").notNull(),
    /** Romanian CUI (digits only, no RO prefix) — company applicants only. */
    companyTaxId: text("company_tax_id"),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    amountEur: numeric("amount_eur", { precision: 12, scale: 2 }).notNull(),
    termMonths: smallint("term_months").notNull(),
    vehiclePriceEurSnapshot: numeric("vehicle_price_eur_snapshot", {
      precision: 12,
      scale: 2,
    }).notNull(),
    estimatedMonthlyEurSnapshot: numeric("estimated_monthly_eur_snapshot", {
      precision: 12,
      scale: 2,
    }).notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    consentVersion: text("consent_version").notNull().default("finance-v1"),
    status: financeApplicationStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("finance_applications_tenant_id_idx").on(table.tenantId),
    index("finance_applications_vehicle_id_idx").on(table.vehicleId),
    index("finance_applications_lead_id_idx").on(table.leadId),
    index("finance_applications_status_idx").on(table.status),
    index("finance_applications_created_at_idx").on(table.createdAt),
  ],
);
