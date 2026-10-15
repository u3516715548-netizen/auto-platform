import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenantPageKindEnum, tenantPageStatusEnum } from "./enums";
import { tenants } from "./tenants";

/**
 * Etapa 23A + Phase 6 — CMS / SEO landing pages per tenant.
 * Draft & archived are never public; anon SELECT only published on active|trial.
 */
export const tenantPages = pgTable(
  "tenant_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    status: tenantPageStatusEnum("status").notNull().default("draft"),
    pageKind: tenantPageKindEnum("page_kind").notNull().default("custom"),
    locale: text("locale").notNull().default("ro"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    h1: text("h1"),
    intro: text("intro").notNull().default(""),
    ctaLabel: text("cta_label"),
    ctaHref: text("cta_href"),
    ogImagePath: text("og_image_path"),
    /** Relative path only (`/p/…`, `/vehicles/…`, `/`). Absolute URLs rejected. */
    canonicalPath: text("canonical_path"),
    noindex: boolean("noindex").notNull().default(false),
    includeInSitemap: boolean("include_in_sitemap").notNull().default(true),
    faq: jsonb("faq").$type<Array<{ question: string; answer: string }>>().notNull().default([]),
    catalogFilters: jsonb("catalog_filters")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    internalLinks: jsonb("internal_links")
      .$type<Array<{ label: string; path: string }>>()
      .notNull()
      .default([]),
    updatedBy: uuid("updated_by"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tenant_pages_tenant_slug_uidx").on(table.tenantId, table.slug),
    index("tenant_pages_tenant_status_idx").on(table.tenantId, table.status),
    index("tenant_pages_tenant_sitemap_idx").on(
      table.tenantId,
      table.status,
      table.noindex,
      table.includeInSitemap,
    ),
  ],
);
