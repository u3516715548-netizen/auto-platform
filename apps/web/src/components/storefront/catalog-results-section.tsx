"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CatalogQuery } from "@/lib/storefront/catalog-query";
import type { PublicVehicleCatalogDto } from "@/lib/storefront/public-vehicles";
import {
  DEFAULT_CATALOG_VIEW_MODE,
  loadCatalogViewMode,
  persistCatalogViewMode,
  type CatalogViewMode,
} from "@/lib/storefront/catalog-view-mode";
import { CatalogSortMenu } from "@/components/storefront/catalog-sort-menu";
import { CatalogViewToggle } from "@/components/storefront/catalog-view-toggle";
import { PublicVehicleList } from "@/components/storefront/public-vehicle-list";

type CatalogResultsSectionProps = {
  tenantSlug: string;
  vehicles: PublicVehicleCatalogDto[];
  totalLabel: string;
  stockHint: string;
  resultsSrOnly: string;
  query: CatalogQuery;
  emptyState: ReactNode | null;
};

/**
 * Results toolbar + view toggle / sort + vehicle list.
 * View preference is per-tenant in localStorage — never in the URL.
 * Salvate lives on cards + bottom nav — not in this toolbar.
 */
export function CatalogResultsSection({
  tenantSlug,
  vehicles,
  totalLabel,
  stockHint,
  resultsSrOnly,
  query,
  emptyState,
}: CatalogResultsSectionProps) {
  const [viewMode, setViewMode] = useState<CatalogViewMode>(DEFAULT_CATALOG_VIEW_MODE);
  const [hydrated, setHydrated] = useState(false);
  /** Prevents the mount hydrate effect from overwriting an early user click. */
  const userPickedRef = useRef(false);

  useEffect(() => {
    userPickedRef.current = false;
    const stored = loadCatalogViewMode(tenantSlug);
    if (!userPickedRef.current) {
      setViewMode(stored);
    }
    setHydrated(true);
  }, [tenantSlug]);

  function setMode(next: CatalogViewMode) {
    userPickedRef.current = true;
    setViewMode(next);
    persistCatalogViewMode(tenantSlug, next);
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div
        className="catalog-results-toolbar flex items-center justify-between gap-2 rounded-t-2xl border border-[var(--sf-border)] bg-[var(--sf-surface)] px-3 py-2.5 max-md:rounded-b-none max-md:border-b-0 md:gap-3 md:rounded-2xl md:px-5"
        aria-live="polite"
        aria-atomic="true"
        data-catalog-results-toolbar="true"
      >
        <p
          className="catalog-results-count min-w-0 shrink-0 text-base font-bold tracking-tight text-[var(--sf-text)] md:text-lg"
          data-catalog-results-count="true"
        >
          <span className="block whitespace-nowrap">{totalLabel}</span>
          <span className="block whitespace-nowrap text-sm font-medium text-[var(--sf-text-muted)]">
            {stockHint}
          </span>
          <span className="sr-only">{resultsSrOnly}</span>
        </p>

        <div
          className="catalog-results-controls flex shrink-0 items-center gap-2.5 md:gap-3"
          data-catalog-results-controls="true"
        >
          <CatalogViewToggle
            viewMode={viewMode}
            onChange={setMode}
            hydrated={hydrated}
          />
          <CatalogSortMenu query={query} />
        </div>
      </div>

      {emptyState ? (
        emptyState
      ) : (
        <PublicVehicleList
          vehicles={vehicles}
          attachToToolbar
          viewMode={viewMode}
        />
      )}
    </div>
  );
}
