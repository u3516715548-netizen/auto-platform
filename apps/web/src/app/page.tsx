import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { PublicStorefrontShell } from "@/components/storefront/public-shell";
import { PublicVehicleList } from "@/components/storefront/public-vehicle-list";
import { CatalogFilters } from "@/components/storefront/catalog-filters";
import { CatalogFilterDrawer } from "@/components/storefront/catalog-filter-drawer";
import { CatalogActiveFilters } from "@/components/storefront/catalog-active-filters";
import { CatalogPagination } from "@/components/storefront/catalog-pagination";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import {
  buildCatalogHref,
  CATALOG_SORT_LABELS_RO,
  DEFAULT_CATALOG_QUERY,
  type CatalogQuery,
} from "@/lib/storefront/catalog-query";
import { publicSavedPath } from "@/lib/storefront/paths";
import { IconBookmark, IconGrid, IconSort } from "@/components/storefront/icons";

/** Always read fresh inventory — reserved/sold must not linger in storefront cache. */
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolved = await resolvePublicTenantFromHost();
  const params = await searchParams;
  const hasQuery = catalogUrlHasQueryString(params);

  if (resolved.kind === "ok") {
    return buildPublicCatalogMetadata({
      dealerName: resolved.tenant.name,
      hasQuery,
    });
  }
  if (resolved.kind === "apex") {
    return {
      title: "Auto Platform",
      description: "Platformă multi-tenant pentru dealeri auto.",
    };
  }
  return { title: "Negăsit" };
}

function nextSortHref(query: CatalogQuery): string {
  const order = ["newest", "price_asc", "price_desc", "year_desc", "mileage_asc"] as const;
  const idx = order.indexOf(query.sort);
  const next = order[(idx + 1) % order.length]!;
  return buildCatalogHref({ ...query, sort: next, page: 1 });
}

/**
 * Apex → platform landing.
 * Tenant host → public catalog with Etapa 8 filters + pagination.
 */
export default async function RootPage({ searchParams }: PageProps) {
  const resolved = await resolvePublicTenantFromHost();

  if (shouldDenyPublicStorefront(resolved)) {
    notFound();
  }

  if (resolved.kind === "apex") {
    return <ApexLanding />;
  }

  if (resolved.kind !== "ok") {
    notFound();
  }

  const tenantView = await toPublicTenantViewForRequest(resolved.tenant);
  const params = await searchParams;
  let catalog: PublicCatalogResult | null = null;
  let listError: string | null = null;
  try {
    catalog = await listPublicVehiclesForCatalog(resolved.tenant.tenantId, params);
  } catch {
    listError = "Stocul nu poate fi afișat momentan. Încearcă din nou mai târziu.";
  }

  const vehicles = catalog?.items ?? [];
  const total = catalog?.total ?? 0;
  const page = catalog?.page ?? 1;
  const totalPages = catalog?.totalPages ?? 1;
  const query = catalog?.query ?? DEFAULT_CATALOG_QUERY;
  const hasFilterChips = catalogQueryHasFilterChips(query);
  const sortLabel = CATALOG_SORT_LABELS_RO[query.sort];

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
      <div className="sf-glow-ambient flex min-w-0 flex-col gap-4 sm:gap-6">
        <h2 className="sr-only">Vehicule disponibile</h2>

        <CatalogFilterDrawer
          query={query}
          brands={brands.length > 0 ? brands : undefined}
          priceCeiling={priceCeiling}
          yearFloor={yearFloor}
          yearCeiling={yearCeiling}
        />
        <div className="hidden md:block">
          <CatalogFilters
            query={query}
            idPrefix="catalog-desktop"
            submitLabel="Vezi Rezultatele"
            className="sf-solid-card flex flex-col gap-4 rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] p-4 sm:p-5"
          />
        </div>
        <CatalogActiveFilters query={query} />

        {listError ? <FeedbackBanner variant="error">{listError}</FeedbackBanner> : null}

        {!listError ? (
          <div
            className="flex items-center justify-between gap-3"
            aria-live="polite"
            aria-atomic="true"
          >
            <div>
              <p className="text-lg font-bold tracking-tight text-[var(--sf-text)]">
                {total === 1 ? "1 mașină" : `${total} mașini`}
              </p>
              <p className="text-sm text-[var(--sf-text-muted)]">în stoc</p>
              <span className="sr-only">{catalogResultsLabel(total)}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--sf-border)] bg-white text-[var(--sf-text-muted)]"
                aria-hidden
                title="Vizualizare listă"
              >
                <IconGrid size={16} />
              </span>
              <Link
                href={publicSavedPath()}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--sf-border)] bg-white px-2.5 text-xs font-semibold text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
              >
                <IconBookmark size={14} />
                Salvează
              </Link>
              <Link
                href={nextSortHref(query)}
                className="inline-flex min-h-10 max-w-[7.5rem] items-center gap-1.5 truncate rounded-xl border border-[var(--sf-border)] bg-white px-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                style={{ color: "var(--sf-accent)" }}
                title={`Sortare: ${sortLabel}. Apasă pentru următoarea.`}
              >
                <IconSort size={14} />
                <span className="truncate">
                  {query.sort === "newest" ? "Recente" : sortLabel}
                </span>
              </Link>
            </div>
          </div>
        ) : null}

        {!listError && total === 0 ? (
          <div className="rounded-[var(--sf-radius-lg)] border border-dashed border-[var(--sf-border)] bg-white px-4 py-10 text-center">
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
        ) : null}

        {!listError && vehicles.length > 0 ? (
          <PublicVehicleList vehicles={vehicles} />
        ) : null}

        {!listError && vehicles.length > 0 ? (
          <CatalogPagination query={query} page={page} totalPages={totalPages} />
        ) : null}
      </div>
    </PublicStorefrontShell>
  );
}

function ApexLanding() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10 sm:max-w-2xl sm:px-6 sm:py-16">
      <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Auto Platform</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        Platformă pentru dealeri auto
      </h1>
      <p className="text-base leading-7 text-zinc-600">
        Storefront-ul public este pe hostul dealerului (ex.{" "}
        <span className="font-mono text-xs">acme.localhost:3000</span>
        ). Dashboard-ul staff rămâne pe{" "}
        <span className="font-mono text-xs">/login</span> și{" "}
        <span className="font-mono text-xs">/dashboard</span>.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Autentificare dealer
        </Link>
      </div>
    </main>
  );
}
