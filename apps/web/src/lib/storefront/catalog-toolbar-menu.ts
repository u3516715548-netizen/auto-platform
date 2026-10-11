/** Shared geometry / chrome for catalog toolbar menus (sort). */

export const CATALOG_TOOLBAR_MENU_Z = 120;

/** Opaque white panel — intentional on T1 and T2 for contrast. */
export const CATALOG_TOOLBAR_MENU_PANEL_CLASS =
  "overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-white py-1 text-zinc-900 shadow-[0_8px_24px_rgba(24,24,27,0.14)]";

export const CATALOG_TOOLBAR_TRIGGER_CLASS =
  "catalog-toolbar-menu-trigger inline-flex h-10 min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] px-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]";

/** Square icon-only view switch — same height as sort trigger. */
export const CATALOG_VIEW_TOGGLE_CLASS =
  "catalog-view-toggle inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]";

export type CatalogToolbarMenuBox = {
  placement: "below";
  top: number;
  bottom: "auto";
  left: number;
  width: number;
  maxHeight: number;
};

type ViewportLike = {
  innerHeight: number;
  innerWidth: number;
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
 * Always open below the trigger, right-aligned to it.
 * Caps height with scroll when space is tight — never flips above.
 */
export function computeCatalogToolbarMenuBox(
  rect: DOMRect,
): CatalogToolbarMenuBox {
  const view = getViewport();
  const navClearance = 80;
  const gap = 6;
  const spaceBelow = view.innerHeight - rect.bottom - navClearance;
  const preferredMax = 260;
  const maxHeight = Math.min(
    preferredMax,
    Math.max(96, spaceBelow - gap),
  );
  const width = Math.min(Math.max(rect.width, 200), 260);
  const left = Math.max(
    8,
    Math.min(rect.right - width, view.innerWidth - width - 8),
  );

  return {
    placement: "below",
    top: rect.bottom + gap,
    bottom: "auto",
    left,
    width,
    maxHeight,
  };
}
