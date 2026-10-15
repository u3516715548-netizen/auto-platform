import { desc, eq } from "drizzle-orm";
import { getDb, tenantPages, withTenantContext } from "@auto-platform/db";
import type {
  LandingCatalogFilters,
  TenantPageKind,
  TenantPageListItem,
  TenantPageStatus,
} from "@auto-platform/types";
import { sanitizeLandingCatalogFilters } from "@auto-platform/types";
import type { MembershipSession } from "@/lib/auth/require-membership";

export async function listTenantPagesForSettings(
  session: MembershipSession,
): Promise<TenantPageListItem[]> {
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const rows = await withTenantContext(
    getDb(),
    { profileId, tenantId },
    async (db) =>
      db
        .select({
          id: tenantPages.id,
          slug: tenantPages.slug,
          title: tenantPages.title,
          status: tenantPages.status,
          pageKind: tenantPages.pageKind,
          noindex: tenantPages.noindex,
          includeInSitemap: tenantPages.includeInSitemap,
          updatedAt: tenantPages.updatedAt,
          publishedAt: tenantPages.publishedAt,
        })
        .from(tenantPages)
        .where(eq(tenantPages.tenantId, tenantId))
        .orderBy(desc(tenantPages.updatedAt)),
  );

  return rows.map((row) => ({
    pageId: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status as TenantPageStatus,
    pageKind: row.pageKind as TenantPageKind,
    noindex: row.noindex === true,
    includeInSitemap: row.includeInSitemap !== false,
    updatedAt: row.updatedAt.toISOString(),
    ...(row.publishedAt ? { publishedAt: row.publishedAt.toISOString() } : {}),
  }));
}

export type TenantPageSettingsDetail = {
  pageId: string;
  slug: string;
  title: string;
  body: string;
  status: TenantPageStatus;
  pageKind: TenantPageKind;
  seoTitle: string | null;
  seoDescription: string | null;
  h1: string | null;
  intro: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  ogImagePath: string | null;
  canonicalPath: string | null;
  noindex: boolean;
  includeInSitemap: boolean;
  faq: Array<{ question: string; answer: string }>;
  catalogFilters: LandingCatalogFilters;
  internalLinks: Array<{ label: string; path: string }>;
};

export async function getTenantPageForSettings(
  session: MembershipSession,
  pageId: string,
): Promise<TenantPageSettingsDetail | null> {
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const row = await withTenantContext(
    getDb(),
    { profileId, tenantId },
    async (db) =>
      db.query.tenantPages.findFirst({
        where: eq(tenantPages.id, pageId),
      }),
  );

  if (!row || row.tenantId !== tenantId) return null;

  return {
    pageId: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    status: row.status as TenantPageStatus,
    pageKind: row.pageKind as TenantPageKind,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    h1: row.h1,
    intro: row.intro ?? "",
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    ogImagePath: row.ogImagePath,
    canonicalPath: row.canonicalPath,
    noindex: row.noindex === true,
    includeInSitemap: row.includeInSitemap !== false,
    faq: Array.isArray(row.faq) ? (row.faq as Array<{ question: string; answer: string }>) : [],
    catalogFilters: sanitizeLandingCatalogFilters(row.catalogFilters) ?? {},
    internalLinks: Array.isArray(row.internalLinks)
      ? (row.internalLinks as Array<{ label: string; path: string }>)
      : [],
  };
}
