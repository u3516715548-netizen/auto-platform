/** Shared geometry / chrome for catalog toolbar dropdowns (view + sort). */

export const CATALOG_TOOLBAR_MENU_Z = 120;

/** Opaque white panel — intentional on T1 and T2 for contrast. */
export const CATALOG_TOOLBAR_MENU_PANEL_CLASS =
  "overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-white py-1 text-zinc-900 shadow-[0_8px_24px_rgba(24,24,27,0.14)]";

export const CATALOG_TOOLBAR_TRIGGER_CLASS =
  "catalog-toolbar-menu-trigger inline-flex h-10 min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] px-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] md:flex-initial";

export type CatalogToolbarMenuBox = {
  placement: "below" | "above";
  top: number | "auto";
  bottom: number | "auto";
  left: number;
  width: number;
  maxHeight: number;
};

type ViewportLike = {
  innerHeight: number;
  innerWidth: number;
  matchMedia: (query: string) => { matches: boolean };
};

function getViewport(): ViewportLike {
  const g = globalThis as typeof globalThis & { window?: ViewportLike };
  return g.window ?? (globalThis as unknown as ViewportLike);
}

/** Portal target that keeps Template CSS variables (accent, etc.). */
export function getCatalogToolbarMenuPortalRoot(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("catalog toolbar menu portal requires document");
  }
  return (
    document.querySelector<HTMLElement>(
      ".storefront-template-1, .storefront-template-2",
    ) ?? document.body
  );
}

/**
 * Prefer opening above the trigger on mobile so menus do not cover result cards.
 * Compact width stays close to the trigger.
 */
export function computeCatalogToolbarMenuBox(
  rect: DOMRect,
): CatalogToolbarMenuBox {
  const view = getViewport();
  const navClearance = 80;
  const gap = 6;
  const spaceBelow = view.innerHeight - rect.bottom - navClearance;
  const spaceAbove = rect.top - 8;
  const preferredMax = 260;
  const isMobile = view.matchMedia("(max-width: 767px)").matches;
  const placeAbove =
    isMobile || (spaceBelow < 180 && spaceAbove > spaceBelow);
  const maxHeight = Math.min(
    preferredMax,
    Math.max(96, placeAbove ? spaceAbove - gap : spaceBelow - gap),
  );
  const width = Math.min(Math.max(rect.width, 200), 260);

  return {
    placement: placeAbove ? "above" : "below",
    top: placeAbove ? "auto" : rect.bottom + gap,
    bottom: placeAbove ? view.innerHeight - rect.top + gap : "auto",
    left: Math.min(rect.left, view.innerWidth - width - 8),
    width,
    maxHeight,
  };
}
