"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CatalogQuery } from "@/lib/storefront/catalog-query";
import { countActiveCatalogFilters } from "@/lib/storefront/catalog-chips";
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
import { emitMarketingEvent } from "@/lib/marketing/emit-marketing-event";

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

  useEffect(() => {
    const filterCount = countActiveCatalogFilters(query);
    const listKey = [
      query.q ?? "",
      query.page,
      query.sort,
      query.make.join(","),
      String(filterCount),
      String(vehicles.length),
    ].join("|");

    emitMarketingEvent(
      "view_item_list",
      {
        page_type: "catalog",
        list_id: "catalog",
        list_name: "catalog",
        items_count: vehicles.length,
        filter_count: filterCount,
        ...(query.q ? { search_term: query.q } : {}),
      },
      { dedupeKey: `view_item_list:${tenantSlug}:${listKey}` },
    );

    if (query.q?.trim()) {
      emitMarketingEvent(
        "search",
        {
          page_type: "catalog",
          search_term: query.q.trim(),
          filter_count: filterCount,
          items_count: vehicles.length,
        },
        { dedupeKey: `search:${tenantSlug}:${query.q.trim()}:${filterCount}` },
      );
    }
  }, [tenantSlug, query, vehicles.length]);

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
