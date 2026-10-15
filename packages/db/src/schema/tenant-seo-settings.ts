import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

/**
 * Etapa 23A + Phase 2 SEO Core — 1:1 SEO preferences per tenant.
 * Anon has no row SELECT; public whitelist via app.public_seo_settings.
 */
export const tenantSeoSettings = pgTable("tenant_seo_settings", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  seoTitleDefault: text("seo_title_default"),
  seoDescriptionDefault: text("seo_description_default"),
  faviconPath: text("favicon_path"),
  indexingEnabled: boolean("indexing_enabled").notNull().default(true),
  /** Optional Next-style template; must contain `%s`. `{dealer}` is replaced at render. */
  titleTemplate: text("title_template"),
  /** Stable OG/social fallback image (https or brand asset path). */
  ogImagePath: text("og_image_path"),
  /** Twitter/X handle without @. */
  twitterHandle: text("twitter_handle"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
