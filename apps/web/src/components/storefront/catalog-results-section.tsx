"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PublicVehicleCatalogDto } from "@/lib/storefront/public-vehicles";
import {
  catalogViewToggleAria,
  DEFAULT_CATALOG_VIEW_MODE,
  loadCatalogViewMode,
  persistCatalogViewMode,
  type CatalogViewMode,
} from "@/lib/storefront/catalog-view-mode";
import { PublicVehicleList } from "@/components/storefront/public-vehicle-list";
import { IconGrid, IconList, IconSort } from "@/components/storefront/icons";

type CatalogResultsSectionProps = {
  tenantSlug: string;
  vehicles: PublicVehicleCatalogDto[];
  totalLabel: string;
  stockHint: string;
  resultsSrOnly: string;
  sortHref: string;
  sortLabel: string;
  sortShortLabel: string;
  emptyState: ReactNode | null;
};

const toggleBase =
  "inline-flex size-10 items-center justify-center rounded-xl border text-[var(--sf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]";

function toggleClass(active: boolean): string {
  return active
    ? `${toggleBase} border-[var(--sf-accent)] bg-[color-mix(in_srgb,var(--sf-accent)_14%,var(--sf-surface))] text-[var(--sf-text)]`
    : `${toggleBase} border-[var(--sf-border)] bg-[var(--sf-surface-muted)] text-[var(--sf-text-muted)]`;
}

/**
 * Results toolbar + grid/list toggle (client) + vehicle list.
 * View preference is per-tenant in localStorage — never in the URL.
 * Salvate lives on cards + bottom nav — not in this toolbar.
 */
export function CatalogResultsSection({
  tenantSlug,
  vehicles,
  totalLabel,
  stockHint,
  resultsSrOnly,
  sortHref,
  sortLabel,
  sortShortLabel,
  emptyState,
}: CatalogResultsSectionProps) {
  const [viewMode, setViewMode] = useState<CatalogViewMode>(DEFAULT_CATALOG_VIEW_MODE);
  const [hydrated, setHydrated] = useState(false);
  /** Prevents the mount hydrate effect from overwriting an early user click. */
  const userPickedRef = useRef(false);

  useEffect(() => {
    userPickedRef.current = false;
    const stored = loadCatalogViewMode(tenantSlug);
    // Skip applying storage if the user already toggled before hydrate finished.
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

  const gridAria = catalogViewToggleAria(viewMode, "grid");
  const listAria = catalogViewToggleAria(viewMode, "list");
  const sortAriaLabel = `Sortare: ${sortLabel}. Apasă pentru următoarea.`;

  return (
    <div className="flex min-w-0 flex-col">
      <div
        className="catalog-results-toolbar flex flex-col gap-2 rounded-t-2xl border border-[var(--sf-border)] bg-[var(--sf-surface)] px-3 py-2.5 max-md:rounded-b-none max-md:border-b-0 md:flex-row md:items-center md:justify-between md:gap-3 md:rounded-2xl md:px-5"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight text-[var(--sf-text)]">{totalLabel}</p>
          <p className="text-sm text-[var(--sf-text-muted)]">{stockHint}</p>
          <span className="sr-only">{resultsSrOnly}</span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 md:shrink-0 md:justify-end">
          <div
            className="inline-flex items-center gap-1"
            role="group"
            aria-label="Mod vizualizare catalog"
          >
            <button
              type="button"
              className={toggleClass(viewMode === "grid")}
              aria-pressed={gridAria["aria-pressed"]}
              aria-label={gridAria["aria-label"]}
              title="Vizualizare grid"
              onClick={() => setMode("grid")}
              data-catalog-view-toggle="grid"
              data-hydrated={hydrated ? "true" : "false"}
            >
              <IconGrid size={16} />
            </button>
            <button
              type="button"
              className={toggleClass(viewMode === "list")}
              aria-pressed={listAria["aria-pressed"]}
              aria-label={listAria["aria-label"]}
              title="Vizualizare listă"
              onClick={() => setMode("list")}
              data-catalog-view-toggle="list"
            >
              <IconList size={16} />
            </button>
          </div>
          <Link
            href={sortHref}
            prefetch={false}
            className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] px-2.5 text-xs font-semibold sm:flex-initial focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
            style={{ color: "var(--sf-accent)" }}
            aria-label={sortAriaLabel}
            title={sortAriaLabel}
          >
            <IconSort size={14} className="shrink-0" />
            <span className="min-w-0 truncate">{sortShortLabel}</span>
          </Link>
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
