import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { companyEntityTypeEnum } from "./enums";
import { tenants } from "./tenants";

/**
 * Etapa 22 — 1:1 company identity/contact profile per tenant.
 * Fiscal and address data live here (not in tenants.branding jsonb).
 * Anon has no row-level SELECT; public fields go through app.public_company_profile.
 */
export const tenantCompanyProfiles = pgTable(
  "tenant_company_profiles",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    legalName: text("legal_name"),
    tradingName: text("trading_name"),
    taxId: text("tax_id"),
    registrationNumber: text("registration_number"),
    entityType: companyEntityTypeEnum("entity_type"),
    publicEmail: text("public_email"),
    publicPhone: text("public_phone"),
    website: text("website"),
    registeredAddress: text("registered_address"),
    showroomAddress: text("showroom_address"),
    city: text("city"),
    county: text("county"),
    country: text("country").default("RO"),
    postalCode: text("postal_code"),
    businessHours: jsonb("business_hours").$type<Record<string, unknown>>().notNull().default({}),
    logoPath: text("logo_path"),
    faviconPath: text("favicon_path"),
    currency: text("currency").notNull().default("EUR"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("tenant_company_profiles_city_idx").on(table.city)],
);
