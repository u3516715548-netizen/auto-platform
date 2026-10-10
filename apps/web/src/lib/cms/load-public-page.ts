import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { getDb, tenantPages } from "@auto-platform/db";
import type { PublicTenantPageView, TenantPageKind } from "@auto-platform/types";
import { normalizeTenantPageSlug } from "@auto-platform/types";
import { clearPublicSessionGucs } from "@/lib/storefront/clear-public-session";

/**
 * Loads a published CMS page for the Host tenant under anon RLS.
 * Draft / missing / wrong tenant → null (caller 404s).
 */
export const loadPublicTenantPage = cache(
  async (
    tenantId: string,
    rawSlug: string,
  ): Promise<PublicTenantPageView | null> => {
    const slug = normalizeTenantPageSlug(rawSlug);
    if (!slug) return null;

    const db = getDb();
    await clearPublicSessionGucs(db);

    const [row] = await db
      .select({
        slug: tenantPages.slug,
        title: tenantPages.title,
        body: tenantPages.body,
        pageKind: tenantPages.pageKind,
        seoTitle: tenantPages.seoTitle,
        seoDescription: tenantPages.seoDescription,
        status: tenantPages.status,
      })
      .from(tenantPages)
      .where(
        and(
          eq(tenantPages.tenantId, tenantId),
          eq(tenantPages.slug, slug),
          eq(tenantPages.status, "published"),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      slug: row.slug,
      title: row.title,
      body: row.body,
      pageKind: row.pageKind as TenantPageKind,
      ...(row.seoTitle ? { seoTitle: row.seoTitle } : {}),
      ...(row.seoDescription ? { seoDescription: row.seoDescription } : {}),
    };
  },
);
