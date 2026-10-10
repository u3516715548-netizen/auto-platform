import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenantPageKindEnum, tenantPageStatusEnum } from "./enums";
import { tenants } from "./tenants";

/**
 * Etapa 23A — CMS pages per tenant (legal + custom).
 * Draft is never public; anon SELECT only published on active|trial tenants.
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
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tenant_pages_tenant_slug_uidx").on(table.tenantId, table.slug),
    index("tenant_pages_tenant_status_idx").on(table.tenantId, table.status),
  ],
);
