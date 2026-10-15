import { and, eq } from "drizzle-orm";
import { getDb, tenantPages, vehicles, withTenantContext } from "@auto-platform/db";
import {
  sanitizeLandingCatalogFilters,
  type PublicSeoSettingsView,
} from "@auto-platform/types";
import type { MembershipSession } from "@/lib/auth/require-membership";
import { getSeoSettingsForSettings } from "@/lib/seo/get-seo-settings";
import { getMarketingIntegrationsForSettings } from "@/lib/marketing/get-marketing-integrations";
import { listPublicPublishedPageSitemapEntries } from "@/lib/seo/list-public-sitemap-entries";
import { listPublicVehiclesForCatalog } from "@/lib/storefront/public-vehicles";
import { landingFiltersToSearchParamsRecord } from "@auto-platform/types";
import { isInventoryPageKind } from "@auto-platform/types";
import {
  evaluateSeoHealth,
  type SeoHealthPageInput,
} from "@/lib/seo/health/evaluate-seo-health";
import { fetchSeoHealthLiveSnapshot } from "@/lib/seo/health/live-fetch";
import { sortSeoHealthIssues, summarizeSeoHealth } from "@/lib/seo/health/summarize";
import type { SeoHealthReport } from "@/lib/seo/health/types";

/**
 * Owner-scoped SEO health report for the session tenant only.
 * Never accepts tenantId from the client.
 */
export async function runSeoHealthForOwnerSession(
  session: MembershipSession,
  options?: { includeLive?: boolean },
): Promise<SeoHealthReport> {
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const includeLive = options?.includeLive !== false;

  const [seoForm, marketing, pageRows, vehicleRows, sitemapEntries] = await Promise.all([
    getSeoSettingsForSettings(session),
    getMarketingIntegrationsForSettings(session),
    withTenantContext(getDb(), { profileId, tenantId }, async (db) =>
      db
        .select({
          id: tenantPages.id,
          slug: tenantPages.slug,
          title: tenantPages.title,
          body: tenantPages.body,
          intro: tenantPages.intro,
          h1: tenantPages.h1,
          status: tenantPages.status,
          pageKind: tenantPages.pageKind,
          seoTitle: tenantPages.seoTitle,
          seoDescription: tenantPages.seoDescription,
          canonicalPath: tenantPages.canonicalPath,
          noindex: tenantPages.noindex,
          includeInSitemap: tenantPages.includeInSitemap,
          faq: tenantPages.faq,
          catalogFilters: tenantPages.catalogFilters,
        })
        .from(tenantPages)
        .where(eq(tenantPages.tenantId, tenantId)),
    ),
    withTenantContext(getDb(), { profileId, tenantId }, async (db) =>
      db
        .select({
          slug: vehicles.slug,
          make: vehicles.make,
          model: vehicles.model,
          year: vehicles.year,
          price: vehicles.price,
        })
        .from(vehicles)
        .where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.status, "available")))
        .limit(8),
    ),
    listPublicPublishedPageSitemapEntries(tenantId),
  ]);

  const seo: PublicSeoSettingsView = {
    indexingEnabled: seoForm.indexingEnabled,
    ...(seoForm.seoTitleDefault ? { seoTitleDefault: seoForm.seoTitleDefault } : {}),
    ...(seoForm.seoDescriptionDefault
      ? { seoDescriptionDefault: seoForm.seoDescriptionDefault }
      : {}),
    ...(seoForm.faviconPath ? { faviconPath: seoForm.faviconPath } : {}),
    ...(seoForm.titleTemplate ? { titleTemplate: seoForm.titleTemplate } : {}),
    ...(seoForm.ogImagePath ? { ogImagePath: seoForm.ogImagePath } : {}),
    ...(seoForm.twitterHandle ? { twitterHandle: seoForm.twitterHandle } : {}),
  };

  const pages: SeoHealthPageInput[] = [];
  for (const row of pageRows) {
    const catalogFilters = sanitizeLandingCatalogFilters(row.catalogFilters) ?? {};
    let inventoryVehicleCount: number | undefined;
    if (isInventoryPageKind(row.pageKind) && row.status === "published") {
      const catalog = await listPublicVehiclesForCatalog(
        tenantId,
        landingFiltersToSearchParamsRecord(catalogFilters),
      );
      inventoryVehicleCount = catalog.total;
    }
    pages.push({
      pageId: row.id,
      slug: row.slug,
      title: row.title,
      body: row.body,
      intro: row.intro ?? "",
      h1: row.h1,
      status: row.status as SeoHealthPageInput["status"],
      pageKind: row.pageKind as SeoHealthPageInput["pageKind"],
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      canonicalPath: row.canonicalPath,
      noindex: row.noindex === true,
      includeInSitemap: row.includeInSitemap !== false,
      faq: Array.isArray(row.faq)
        ? (row.faq as Array<{ question: string; answer: string }>)
        : [],
      catalogFilters,
      inventoryVehicleCount,
    });
  }

  // Cover image presence: best-effort via catalog list (has cover when url present).
  const catalogSample = await listPublicVehiclesForCatalog(tenantId, {});
  const coverBySlug = new Map(
    catalogSample.items.map((v) => [v.slug, Boolean(v.coverImage?.url)] as const),
  );

  const draftSlug = pages.find((p) => p.status === "draft")?.slug ?? null;

  let live = null;
  const methodNotes = [
    "DB + metadata builders (static, deterministic)",
    "Sitemap eligibility mirrors listPublicPublishedPageSitemapEntries",
  ];
  if (includeLive) {
    live = await fetchSeoHealthLiveSnapshot({
      tenantSlug: session.tenant.slug,
      draftSlug,
    });
    methodNotes.push(
      "Live HTTP via Host header against local/public web (robots, sitemap, utility pages, consent)",
    );
  }

  const issues = sortSeoHealthIssues(
    evaluateSeoHealth({
      tenantSlug: session.tenant.slug,
      tenantName: session.tenant.name,
      seo,
      pages,
      sitemapCmsPaths: sitemapEntries.map((e) => e.path),
      vehicles: vehicleRows.map((v) => ({
        slug: v.slug,
        make: v.make,
        model: v.model,
        year: v.year,
        price: String(v.price),
        hasCoverImage: coverBySlug.get(v.slug) ?? false,
      })),
      marketing,
      live,
    }),
  );

  return {
    tenantSlug: session.tenant.slug,
    tenantName: session.tenant.name,
    generatedAt: new Date().toISOString(),
    methodNotes,
    summary: summarizeSeoHealth(issues),
    issues,
  };
}
