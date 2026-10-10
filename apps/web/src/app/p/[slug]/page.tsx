import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  resolvePublicTenantFromHost,
  shouldDenyPublicStorefront,
  toPublicTenantViewForRequest,
} from "@/lib/storefront/resolve-public-tenant";
import { loadPublicTenantPage } from "@/lib/cms/load-public-page";
import { renderTenantPageBodyHtml } from "@/lib/cms/page-body";
import { buildPublicCmsPageMetadata } from "@/lib/seo/build-page-metadata";
import { loadPublicSeoSettings } from "@/lib/seo/load-public-seo-settings";
import { PublicStorefrontShell } from "@/components/storefront/public-shell";
import { normalizeTenantPageSlug } from "@auto-platform/types";
/**
 * Short public HTML freshness for published CMS pages (Etapa 23A.2).
 * Must be a numeric literal for Next static analysis — keep in sync with
 * `PUBLIC_STOREFRONT_REVALIDATE_SECONDS` in `lib/perf/public-storefront-cache.ts`.
 */
export const revalidate = 30;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = normalizeTenantPageSlug(raw);
  const resolved = await resolvePublicTenantFromHost();
  if (resolved.kind !== "ok" || !slug) {
    return { title: "Pagină", robots: { index: false, follow: true } };
  }

  const [page, seo] = await Promise.all([
    loadPublicTenantPage(resolved.tenant.tenantId, slug),
    loadPublicSeoSettings(resolved.tenant.tenantId),
  ]);
  if (!page) {
    return { title: "Pagină indisponibilă", robots: { index: false, follow: true } };
  }

  return buildPublicCmsPageMetadata({
    page,
    dealerName: resolved.tenant.name,
    seo,
  });
}

/**
 * Public CMS page — published only, Host tenant, sanitized body.
 */
export default async function PublicCmsPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = normalizeTenantPageSlug(raw);
  if (!slug) notFound();

  const resolved = await resolvePublicTenantFromHost();
  if (shouldDenyPublicStorefront(resolved) || resolved.kind !== "ok") {
    notFound();
  }

  const [page, tenantView] = await Promise.all([
    loadPublicTenantPage(resolved.tenant.tenantId, slug),
    toPublicTenantViewForRequest(resolved.tenant),
  ]);
  if (!page) notFound();

  const bodyHtml = renderTenantPageBodyHtml(page.body);

  return (
    <PublicStorefrontShell tenant={tenantView}>
      <article className="mx-auto max-w-3xl py-4 md:py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--sf-text)] md:text-3xl">
          {page.title}
        </h1>
        <div
          className="prose-cms mt-6 text-base leading-7 text-[var(--sf-text)]"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </article>
    </PublicStorefrontShell>
  );
}
