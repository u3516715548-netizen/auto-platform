import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenantPlanEnum, tenantStatusEnum } from "./enums";

/**
 * Tenant root table.
 *
 * RLS (migration source of truth — do not weaken FORCE RLS):
 * - `0001_rls_and_helpers.sql`: ENABLE + FORCE RLS;
 *   `tenants_select_member`, `tenants_update_owner`
 * - `0002_tenants_public_storefront_select.sql`:
 *   `tenants_select_public_storefront` — anon SELECT for status IN (active, trial) only
 *
 * Public DTO whitelist (app layer): name, slug, branding.primaryColor / templateId / phone / whatsapp (validated).
 * Never expose id / plan / custom_domain / raw branding to the browser.
 */
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: tenantStatusEnum("status").notNull().default("trial"),
    plan: tenantPlanEnum("plan").notNull().default("starter"),
    customDomain: text("custom_domain"),
    branding: jsonb("branding").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tenants_slug_uidx").on(table.slug),
    uniqueIndex("tenants_custom_domain_uidx").on(table.customDomain),
  ],
);
