import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  resolvePublicTenantFromHost,
  shouldDenyPublicStorefront,
  toPublicTenantViewForRequest,
} from "@/lib/storefront/resolve-public-tenant";
import { loadPublicTenantPage } from "@/lib/cms/load-public-page";
import { renderTenantPageBodyHtml } from "@/lib/cms/page-body";
import { buildPublicCmsPageMetadata } from "@/lib/seo/build-page-metadata";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
  buildOrganizationJsonLd,
  buildWebPageJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo/build-json-ld";
import { loadPublicSeoSettings } from "@/lib/seo/load-public-seo-settings";
import { getPublicRequestOrigin } from "@/lib/seo/public-origin";
import { JsonLd } from "@/components/seo/json-ld";
import { PublicStorefrontShell } from "@/components/storefront/public-shell";
import { PublicVehicleList } from "@/components/storefront/public-vehicle-list";
import {
  isInventoryPageKind,
  landingFiltersToSearchParamsRecord,
  normalizeTenantPageSlug,
} from "@auto-platform/types";
import { listPublicVehiclesForCatalog } from "@/lib/storefront/public-vehicles";

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

  const [page, seo, origin] = await Promise.all([
    loadPublicTenantPage(resolved.tenant.tenantId, slug),
    loadPublicSeoSettings(resolved.tenant.tenantId),
    getPublicRequestOrigin(),
  ]);
  if (!page) {
    return { title: "Pagină indisponibilă", robots: { index: false, follow: true } };
  }

  return buildPublicCmsPageMetadata({
    page,
    dealerName: resolved.tenant.name,
    seo,
    origin,
  });
}

/**
 * Public CMS / SEO landing page — published only, Host tenant, sanitized body.
 */
export default async function PublicCmsPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = normalizeTenantPageSlug(raw);
  if (!slug) notFound();

  const resolved = await resolvePublicTenantFromHost();
  if (shouldDenyPublicStorefront(resolved) || resolved.kind !== "ok") {
    notFound();
  }

  const [page, tenantView, origin, seo] = await Promise.all([
    loadPublicTenantPage(resolved.tenant.tenantId, slug),
    toPublicTenantViewForRequest(resolved.tenant),
    getPublicRequestOrigin(),
    loadPublicSeoSettings(resolved.tenant.tenantId),
  ]);
  if (!page) notFound();

  const bodyHtml = renderTenantPageBodyHtml(page.body);
  const path = page.canonicalPath || `/p/${page.slug}`;
  const heading = page.h1?.trim() || page.title;

  let inventoryVehicles: Awaited<
    ReturnType<typeof listPublicVehiclesForCatalog>
  >["items"] = [];
  if (isInventoryPageKind(page.pageKind)) {
    const catalog = await listPublicVehiclesForCatalog(
      resolved.tenant.tenantId,
      landingFiltersToSearchParamsRecord(page.catalogFilters),
    );
    inventoryVehicles = catalog.items;
  }

  const jsonLd = [
    buildOrganizationJsonLd({
      dealerName: resolved.tenant.name,
      origin,
      company: tenantView.company,
      seo,
    }),
    buildWebSiteJsonLd({ dealerName: resolved.tenant.name, origin }),
    buildWebPageJsonLd({
      name: page.title,
      description: page.seoDescription,
      path,
      origin,
    }),
    buildBreadcrumbJsonLd(
      [
        { name: "Acasă", path: "/" },
        { name: page.title, path: `/p/${page.slug}` },
      ],
      origin,
    ),
  ];

  const faqLd = buildFaqPageJsonLd(page.faq, origin, `/p/${page.slug}`);
  if (faqLd) jsonLd.push(faqLd);

  if (inventoryVehicles.length > 0) {
    const itemList = buildItemListJsonLd({
      name: heading,
      origin,
      path: `/p/${page.slug}`,
      items: inventoryVehicles.map((v) => ({
        name: `${v.make} ${v.model} ${v.year}`,
        path: `/vehicles/${v.slug}`,
      })),
    });
    if (itemList) jsonLd.push(itemList);
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <PublicStorefrontShell tenant={tenantView}>
        <article className="mx-auto max-w-3xl py-4 md:py-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--sf-text)] md:text-3xl">
            {heading}
          </h1>
          {page.intro?.trim() ? (
            <p className="mt-4 text-base leading-7 text-[var(--sf-text-muted)]">{page.intro}</p>
          ) : null}
          {bodyHtml ? (
            <div
              className="prose-cms mt-6 text-base leading-7 text-[var(--sf-text)]"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : null}

          {page.ctaLabel && page.ctaHref ? (
            <p className="mt-8">
              <Link
                href={page.ctaHref}
                prefetch={false}
                className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--sf-accent)" }}
              >
                {page.ctaLabel}
              </Link>
            </p>
          ) : null}

          {page.internalLinks.length > 0 ? (
            <nav aria-label="Linkuri utile" className="mt-8">
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {page.internalLinks.map((link) => (
                  <li key={`${link.label}:${link.path}`}>
                    <Link
                      href={link.path}
                      prefetch={false}
                      className="font-medium text-[var(--sf-accent)] underline-offset-2 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {page.faq.length > 0 ? (
            <section className="mt-10" aria-labelledby="cms-faq-heading">
              <h2
                id="cms-faq-heading"
                className="text-lg font-semibold tracking-tight text-[var(--sf-text)]"
              >
                Întrebări frecvente
              </h2>
              <dl className="mt-4 flex flex-col gap-4">
                {page.faq.map((item) => (
                  <div key={item.question}>
                    <dt className="font-semibold text-[var(--sf-text)]">{item.question}</dt>
                    <dd className="mt-1 text-sm leading-6 text-[var(--sf-text-muted)]">
                      {item.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </article>

        {inventoryVehicles.length > 0 ? (
          <section
            className="mx-auto mt-4 w-full max-w-6xl pb-8"
            aria-labelledby="cms-inventory-heading"
          >
            <h2
              id="cms-inventory-heading"
              className="mb-4 text-lg font-semibold tracking-tight text-[var(--sf-text)]"
            >
              Vehicule din stoc
            </h2>
            <PublicVehicleList vehicles={inventoryVehicles} />
          </section>
        ) : null}
      </PublicStorefrontShell>
    </>
  );
}
