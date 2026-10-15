import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { getDb, tenantPages } from "@auto-platform/db";
import type { PublicTenantPageView, TenantPageKind } from "@auto-platform/types";
import {
  normalizeTenantPageSlug,
  resolvePageCanonicalPath,
  sanitizeLandingCatalogFilters,
} from "@auto-platform/types";
import { clearPublicSessionGucs } from "@/lib/storefront/clear-public-session";

/**
 * Loads a published CMS page for the Host tenant under anon RLS.
 * Draft / archived / missing / wrong tenant → null (caller 404s).
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
        h1: tenantPages.h1,
        intro: tenantPages.intro,
        ctaLabel: tenantPages.ctaLabel,
        ctaHref: tenantPages.ctaHref,
        ogImagePath: tenantPages.ogImagePath,
        canonicalPath: tenantPages.canonicalPath,
        noindex: tenantPages.noindex,
        includeInSitemap: tenantPages.includeInSitemap,
        faq: tenantPages.faq,
        catalogFilters: tenantPages.catalogFilters,
        internalLinks: tenantPages.internalLinks,
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

    const filters = sanitizeLandingCatalogFilters(row.catalogFilters) ?? {};
    const faq = Array.isArray(row.faq) ? row.faq : [];
    const internalLinks = Array.isArray(row.internalLinks) ? row.internalLinks : [];

    return {
      slug: row.slug,
      title: row.title,
      body: row.body,
      pageKind: row.pageKind as TenantPageKind,
      ...(row.seoTitle ? { seoTitle: row.seoTitle } : {}),
      ...(row.seoDescription ? { seoDescription: row.seoDescription } : {}),
      ...(row.h1 ? { h1: row.h1 } : {}),
      ...(row.intro ? { intro: row.intro } : {}),
      ...(row.ctaLabel ? { ctaLabel: row.ctaLabel } : {}),
      ...(row.ctaHref ? { ctaHref: row.ctaHref } : {}),
      ...(row.ogImagePath ? { ogImagePath: row.ogImagePath } : {}),
      canonicalPath: resolvePageCanonicalPath(row.slug, row.canonicalPath),
      noindex: row.noindex === true,
      includeInSitemap: row.includeInSitemap !== false,
      faq: faq
        .filter(
          (item): item is { question: string; answer: string } =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof (item as { question?: unknown }).question === "string" &&
                typeof (item as { answer?: unknown }).answer === "string",
            ),
        )
        .map((item) => ({
          question: item.question,
          answer: item.answer,
        })),
      catalogFilters: filters,
      internalLinks: internalLinks
        .filter(
          (item): item is { label: string; path: string } =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof (item as { label?: unknown }).label === "string" &&
                typeof (item as { path?: unknown }).path === "string",
            ),
        )
        .map((item) => ({ label: item.label, path: item.path })),
    };
  },
);
