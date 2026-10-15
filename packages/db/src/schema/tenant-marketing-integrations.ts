import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

/**
 * Phase 3 — 1:1 marketing integration IDs per tenant.
 * Owner-only RLS. No anon SELECT. No public whitelist function.
 * Runtime loading deferred to Consent + Tracking phases.
 */
export const tenantMarketingIntegrations = pgTable("tenant_marketing_integrations", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  gtmContainerId: text("gtm_container_id"),
  gtmEnabled: boolean("gtm_enabled").notNull().default(true),
  ga4MeasurementId: text("ga4_measurement_id"),
  ga4Enabled: boolean("ga4_enabled").notNull().default(true),
  googleAdsConversionId: text("google_ads_conversion_id"),
  googleAdsConversionLabel: text("google_ads_conversion_label"),
  googleAdsEnabled: boolean("google_ads_enabled").notNull().default(true),
  metaPixelId: text("meta_pixel_id"),
  metaPixelEnabled: boolean("meta_pixel_enabled").notNull().default(true),
  tiktokPixelId: text("tiktok_pixel_id"),
  tiktokPixelEnabled: boolean("tiktok_pixel_enabled").notNull().default(true),
  linkedinPartnerId: text("linkedin_partner_id"),
  linkedinEnabled: boolean("linkedin_enabled").notNull().default(true),
  googleSearchConsoleVerification: text("google_search_console_verification"),
  bingWebmasterVerification: text("bing_webmaster_verification"),
  metaDomainVerification: text("meta_domain_verification"),
  pinterestVerification: text("pinterest_verification"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
