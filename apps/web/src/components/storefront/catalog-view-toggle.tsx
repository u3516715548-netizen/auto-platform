"use client";

import type { CatalogViewMode } from "@/lib/storefront/catalog-view-mode";
import { catalogViewToggleAria } from "@/lib/storefront/catalog-view-mode";
import { CATALOG_VIEW_TOGGLE_CLASS } from "@/lib/storefront/catalog-toolbar-menu";
import { IconGrid, IconList } from "@/components/storefront/icons";

type CatalogViewToggleProps = {
  viewMode: CatalogViewMode;
  onChange: (mode: CatalogViewMode) => void;
  hydrated?: boolean;
};

/**
 * Icon-only Grid ↔ List switch. Shows the *target* mode icon.
 * Preference stays in per-tenant localStorage via the parent.
 */
export function CatalogViewToggle({
  viewMode,
  onChange,
  hydrated = true,
}: CatalogViewToggleProps) {
  const nextMode: CatalogViewMode = viewMode === "grid" ? "list" : "grid";
  const TargetIcon = nextMode === "list" ? IconList : IconGrid;
  const a11y = catalogViewToggleAria(viewMode);

  return (
    <button
      type="button"
      className={CATALOG_VIEW_TOGGLE_CLASS}
      style={{ color: "var(--sf-accent)" }}
      aria-label={a11y["aria-label"]}
      title={a11y.title}
      data-catalog-view-toggle="true"
      data-catalog-view-mode={viewMode}
      data-catalog-view-next={nextMode}
      data-hydrated={hydrated ? "true" : "false"}
      onClick={() => onChange(nextMode)}
    >
      <TargetIcon size={16} className="shrink-0" aria-hidden />
    </button>
  );
}
