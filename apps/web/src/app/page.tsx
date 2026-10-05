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
import { DEFAULT_CATALOG_QUERY } from "@/lib/storefront/catalog-query";

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
  const stickyPad =
    tenantView.phone || tenantView.whatsapp ? "pb-24 md:pb-8" : undefined;

  return (
    <PublicStorefrontShell
      tenant={tenantView}
      stickySurface="catalog"
      mainClassName={stickyPad}
    >
      <div className="flex min-w-0 flex-col gap-6 sm:gap-7">
        <div className="flex flex-col gap-2">
          <p
            className="text-sm font-medium tracking-wide uppercase"
            style={{ color: tenantView.primaryColor }}
          >
            Catalog
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--sf-text)] sm:text-3xl">
            Vehicule disponibile
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[var(--sf-text-muted)]">
            Stocul public al dealerului {tenantView.name}.
          </p>
        </div>

        <CatalogFilterDrawer query={query} />
        <div className="hidden md:block">
          <CatalogFilters
            query={query}
            idPrefix="catalog-desktop"
            submitLabel="Caută"
            className="flex flex-col gap-4 rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-[var(--sf-surface)] p-4 sm:p-5"
          />
        </div>
        <CatalogActiveFilters query={query} />

        {listError ? <FeedbackBanner variant="error">{listError}</FeedbackBanner> : null}

        {!listError ? (
          <p
            className="text-sm font-semibold text-[var(--sf-text)]"
            aria-live="polite"
            aria-atomic="true"
          >
            {catalogResultsLabel(total)}
          </p>
        ) : null}

        {!listError && total === 0 ? (
          <div className="rounded-[var(--sf-radius-lg)] border border-dashed border-[var(--sf-border)] bg-[var(--sf-surface)] px-4 py-10 text-center">
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
