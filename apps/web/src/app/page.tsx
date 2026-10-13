import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SaasLanding } from "@/components/marketing/saas-landing";
import {
  resolvePublicTenantFromHost,
  shouldDenyPublicStorefront,
  toPublicTenantViewForRequest,
} from "@/lib/storefront/resolve-public-tenant";
import { listPublicVehiclesForCatalog, type PublicCatalogResult } from "@/lib/storefront/public-vehicles";
import {
  catalogQueryHasFilterChips,
  catalogResultsLabel,
  resetCatalogHref,
} from "@/lib/storefront/catalog-chips";
import {
  buildPublicCatalogMetadata,
  catalogUrlHasQueryString,
} from "@/lib/storefront/catalog-seo";
import { applySeoDefaultsToCatalogMetadata } from "@/lib/seo/build-page-metadata";
import { loadPublicSeoSettings } from "@/lib/seo/load-public-seo-settings";
import { PublicStorefrontShell } from "@/components/storefront/public-shell";
import {
  CatalogFilterDrawer,
  CatalogStockAvailabilityToggle,
} from "@/components/storefront/catalog-filter-drawer";
import { CatalogScrollCollapse } from "@/components/storefront/catalog-scroll-collapse";
import { CatalogActiveFilters } from "@/components/storefront/catalog-active-filters";
import { CatalogPagination } from "@/components/storefront/catalog-pagination";
import { CatalogResultsSection } from "@/components/storefront/catalog-results-section";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { DEFAULT_CATALOG_QUERY } from "@/lib/storefront/catalog-query";
import { withPerfRoute } from "@/lib/perf/server-timing";

/**
 * Short public HTML / data freshness window (Etapa 23A.2).
 * Must be a numeric literal for Next static analysis — keep in sync with
 * `PUBLIC_STOREFRONT_REVALIDATE_SECONDS` in `lib/perf/public-storefront-cache.ts`.
 * Mutations call `revalidatePublicStorefrontPaths` so reserved/sold do not linger.
 */
export const revalidate = 30;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolved = await resolvePublicTenantFromHost();
  const params = await searchParams;
  const hasQuery = catalogUrlHasQueryString(params);

  if (resolved.kind === "ok") {
    const base = buildPublicCatalogMetadata({
      dealerName: resolved.tenant.name,
      hasQuery,
    });
    const seo = await loadPublicSeoSettings(resolved.tenant.tenantId);
    // SEO settings are independent of catalog query parsing above.
    return applySeoDefaultsToCatalogMetadata(base, seo, resolved.tenant.name);
  }
  if (resolved.kind === "apex") {
    return {
      title: "AUTOBEAR — Showroom online sub brandul tău",
      description:
        "Creează un showroom online pentru stocul auto: pagini clare pentru mașini, cereri de la clienți și administrare simplă. Planuri lunare în RON.",
    };
  }
  return { title: "Negăsit" };
}

/**
 * Apex → commercial SaaS landing (Etapa 26A).
 * Tenant host → public catalog with Etapa 8 filters + pagination.
 */
export default async function RootPage({ searchParams }: PageProps) {
  return withPerfRoute("catalog", async () => {
  const resolved = await resolvePublicTenantFromHost();

  if (shouldDenyPublicStorefront(resolved)) {
    notFound();
  }

  if (resolved.kind === "apex") {
    return <SaasLanding />;
  }

  if (resolved.kind !== "ok") {
    notFound();
  }

  const params = await searchParams;
  let catalog: PublicCatalogResult | null = null;
  let listError: string | null = null;

  // tenant branding/company and catalog inventory are independent after Host resolve.
  const [tenantView, catalogOutcome] = await Promise.all([
    toPublicTenantViewForRequest(resolved.tenant),
    listPublicVehiclesForCatalog(resolved.tenant.tenantId, params)
      .then((result) => ({ ok: true as const, result }))
      .catch(() => ({ ok: false as const })),
  ]);

  if (catalogOutcome.ok) {
    catalog = catalogOutcome.result;
  } else {
    listError = "Stocul nu poate fi afișat momentan. Încearcă din nou mai târziu.";
  }

  const vehicles = catalog?.items ?? [];
  const total = catalog?.total ?? 0;
  const page = catalog?.page ?? 1;
  const totalPages = catalog?.totalPages ?? 1;
  const query = catalog?.query ?? DEFAULT_CATALOG_QUERY;
  const hasFilterChips = catalogQueryHasFilterChips(query);

  const brandSet = new Set<string>([
    "Alfa Romeo",
    "Audi",
    "BMW",
    "Citroën",
    "Dacia",
    "Fiat",
    "Ford",
    "Hyundai",
    "Kia",
    "Mercedes-Benz",
    "Opel",
    "Peugeot",
    "Renault",
    "Skoda",
    "Toyota",
    "Volkswagen",
    "Volvo",
  ]);
  for (const v of vehicles) {
    if (v.make?.trim()) brandSet.add(v.make.trim());
  }
  const brands = Array.from(brandSet).sort((a, b) => a.localeCompare(b, "ro"));
  const priceCeiling = Math.max(
    114_000,
    ...vehicles.map((v) => {
      const n = Number(v.price);
      return Number.isFinite(n) ? Math.ceil(n / 1000) * 1000 : 0;
    }),
  );
  const yearCeiling = new Date().getFullYear();
  const yearFloor = Math.min(
    2001,
    ...vehicles.map((v) => v.year).filter((y) => Number.isFinite(y)),
    yearCeiling,
  );

  return (
    <PublicStorefrontShell tenant={tenantView} stickySurface="catalog">
      <div className="sf-glow-ambient flex min-w-0 flex-col">
        <h2 className="sr-only">Vehicule disponibile</h2>

        <CatalogScrollCollapse
          lead={<CatalogStockAvailabilityToggle framed />}
          filters={
            <CatalogFilterDrawer
              query={query}
              brands={brands.length > 0 ? brands : undefined}
              priceCeiling={priceCeiling}
              yearFloor={yearFloor}
              yearCeiling={yearCeiling}
              showStockToggle={false}
            />
          }
        >
          {listError ? <FeedbackBanner variant="error">{listError}</FeedbackBanner> : null}

          <div className="flex min-w-0 flex-col gap-3">
            {!listError ? (
              <>
                <CatalogActiveFilters query={query} />

                <CatalogResultsSection
                  tenantSlug={tenantView.slug}
                  vehicles={vehicles}
                  totalLabel={total === 1 ? "1 mașină" : `${total} mașini`}
                  stockHint="în stoc"
                  resultsSrOnly={catalogResultsLabel(total)}
                  query={query}
                  emptyState={
                    total === 0 ? (
                      <div className="rounded-b-2xl border border-[var(--sf-border)] bg-[var(--sf-surface)] px-4 py-10 text-center">
                        {hasFilterChips ? (
                          <>
                            <p className="text-base font-medium text-[var(--sf-text)]">
                              Niciun vehicul nu corespunde filtrelor selectate.
                            </p>
                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--sf-text-muted)]">
                              Modifică filtrele sau resetează căutarea.
                            </p>
                            <Link
                              href={resetCatalogHref()}
                              prefetch={false}
                              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--sf-radius)] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                              style={{ backgroundColor: tenantView.primaryColor }}
                            >
                              Resetează filtrele
                            </Link>
                          </>
                        ) : (
                          <>
                            <p className="text-base font-medium text-[var(--sf-text)]">
                              Momentan nu sunt vehicule disponibile.
                            </p>
                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--sf-text-muted)]">
                              Revenim curând cu oferte noi.
                            </p>
                          </>
                        )}
                      </div>
                    ) : null
                  }
                />
              </>
            ) : null}

            {!listError && vehicles.length > 0 ? (
              <CatalogPagination query={query} page={page} totalPages={totalPages} />
            ) : null}
          </div>
        </CatalogScrollCollapse>
      </div>
    </PublicStorefrontShell>
  );
  });
}
