import { and, asc, eq } from "drizzle-orm";
import { getDb, tenantPages, vehicles } from "@auto-platform/db";
import { isSelfCanonicalPage } from "@auto-platform/types";
import { clearPublicSessionGucs } from "@/lib/storefront/clear-public-session";

/** Soft cap to keep sitemap generation bounded (Phase 2). */
export const PUBLIC_SITEMAP_VEHICLE_LIMIT = 2000;

export type PublicSitemapEntry = {
  path: string;
  lastModified?: Date;
};

/**
 * Published + indexable + include_in_sitemap + self-canonical CMS pages.
 * Excludes draft/archived/noindex/non-self-canonical.
 */
export async function listPublicPublishedPageSitemapEntries(
  tenantId: string,
): Promise<PublicSitemapEntry[]> {
  const db = getDb();
  await clearPublicSessionGucs(db);

  const rows = await db
    .select({
      slug: tenantPages.slug,
      updatedAt: tenantPages.updatedAt,
      publishedAt: tenantPages.publishedAt,
      noindex: tenantPages.noindex,
      includeInSitemap: tenantPages.includeInSitemap,
      canonicalPath: tenantPages.canonicalPath,
      title: tenantPages.title,
      body: tenantPages.body,
      intro: tenantPages.intro,
      seoDescription: tenantPages.seoDescription,
    })
    .from(tenantPages)
    .where(and(eq(tenantPages.tenantId, tenantId), eq(tenantPages.status, "published")))
    .orderBy(asc(tenantPages.slug));

  return rows
    .filter((row) => {
      if (row.noindex === true) return false;
      if (row.includeInSitemap === false) return false;
      if (!isSelfCanonicalPage(row.slug, row.canonicalPath)) return false;
      // Exclude empty / unpublishable thin pages from sitemap.
      const contentLen = `${row.intro ?? ""}${row.body ?? ""}`.trim().length;
      if (contentLen < 40) return false;
      if (!(row.seoDescription ?? "").trim()) return false;
      if (!(row.title ?? "").trim()) return false;
      return true;
    })
    .map((row) => ({
      path: `/p/${row.slug}`,
      lastModified: row.updatedAt ?? row.publishedAt ?? undefined,
    }));
}

/**
 * Available vehicles for Host tenant under anon RLS (slug + updated_at only).
 */
export async function listPublicAvailableVehicleSitemapEntries(
  tenantId: string,
  limit = PUBLIC_SITEMAP_VEHICLE_LIMIT,
): Promise<PublicSitemapEntry[]> {
  const db = getDb();
  await clearPublicSessionGucs(db);

  const rows = await db
    .select({
      slug: vehicles.slug,
      updatedAt: vehicles.updatedAt,
    })
    .from(vehicles)
    .where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.status, "available")))
    .orderBy(asc(vehicles.slug))
    .limit(limit);

  return rows.map((row) => ({
    path: `/vehicles/${row.slug}`,
    lastModified: row.updatedAt ?? undefined,
  }));
}
