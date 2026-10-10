/**
 * Public catalog Grid / List preference — client-only, per-tenant localStorage.
 * Not part of URL / Data Cache / SSR filters.
 */

export const CATALOG_VIEW_MODES = ["grid", "list"] as const;
export type CatalogViewMode = (typeof CATALOG_VIEW_MODES)[number];

export const DEFAULT_CATALOG_VIEW_MODE: CatalogViewMode = "grid";

const STORAGE_PREFIX = "ap.sf.catalog-view.v1.";

export function catalogViewModeStorageKey(tenantSlug: string): string {
  return `${STORAGE_PREFIX}${tenantSlug}`;
}

export function isCatalogViewMode(value: unknown): value is CatalogViewMode {
  return value === "grid" || value === "list";
}

/** Safe parse — unknown / missing → grid. */
export function parseCatalogViewMode(raw: unknown): CatalogViewMode {
  if (typeof raw !== "string") return DEFAULT_CATALOG_VIEW_MODE;
  const normalized = raw.trim().toLowerCase();
  return isCatalogViewMode(normalized) ? normalized : DEFAULT_CATALOG_VIEW_MODE;
}

export function loadCatalogViewMode(tenantSlug: string): CatalogViewMode {
  if (typeof window === "undefined" || !tenantSlug) {
    return DEFAULT_CATALOG_VIEW_MODE;
  }
  try {
    return parseCatalogViewMode(
      window.localStorage.getItem(catalogViewModeStorageKey(tenantSlug)),
    );
  } catch {
    return DEFAULT_CATALOG_VIEW_MODE;
  }
}

export function persistCatalogViewMode(
  tenantSlug: string,
  mode: CatalogViewMode,
): void {
  if (typeof window === "undefined" || !tenantSlug) return;
  try {
    window.localStorage.setItem(
      catalogViewModeStorageKey(tenantSlug),
      parseCatalogViewMode(mode),
    );
  } catch {
    // Private mode / quota — ignore; in-memory state still works.
  }
}

/** Grid: 2 cols mobile+tablet, 3 desktop (lg). */
export function catalogGridListClassName(attachToToolbar: boolean): string {
  return [
    "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6",
    attachToToolbar ? "md:mt-3" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** List: one vehicle per row (stack vertically in the ul). */
export function catalogListListClassName(attachToToolbar: boolean): string {
  return [
    "flex flex-col gap-3 sm:gap-4",
    attachToToolbar ? "md:mt-3" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function catalogVehicleListClassName(
  mode: CatalogViewMode,
  attachToToolbar = false,
): string {
  return mode === "list"
    ? catalogListListClassName(attachToToolbar)
    : catalogGridListClassName(attachToToolbar);
}

/**
 * List card: vertical under lg (image top), horizontal from lg (image left).
 * Same structure for T1/T2 — tokens handle color only.
 */
export const CATALOG_LIST_CARD_CLASS =
  "sf-solid-card group relative flex w-full flex-col overflow-hidden border border-[var(--sf-border)] rounded-[var(--sf-radius-lg)] lg:flex-row";

/** Full-bleed media on mobile/tablet; controlled width on desktop. */
export const CATALOG_LIST_MEDIA_CLASS =
  "relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--sf-surface-muted)] lg:aspect-auto lg:min-h-[11rem] lg:w-[38%] lg:max-w-[17rem] lg:self-stretch";

export const CATALOG_LIST_BODY_CLASS =
  "flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-4 lg:py-4 lg:pr-5";

export function catalogViewToggleAria(
  mode: CatalogViewMode,
  button: CatalogViewMode,
): { "aria-pressed": boolean; "aria-label": string } {
  return {
    "aria-pressed": mode === button,
    "aria-label": button === "grid" ? "Vizualizare grid" : "Vizualizare listă",
  };
}
