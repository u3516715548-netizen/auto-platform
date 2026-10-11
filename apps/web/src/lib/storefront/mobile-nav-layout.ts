/**
 * Single source for mobile tab-bar clearance used by filter sheets + nav.
 * Keep in sync with `.sf-mobile-nav` in globals.css / public-shell:
 * ul py-1.5 (0.75rem) + link min-h-12 (3rem) + safe-area on the nav itself.
 */
export const SF_MOBILE_NAV_CLEARANCE_FALLBACK =
  "calc(3.75rem + env(safe-area-inset-bottom, 0px))";

export const SF_MOBILE_NAV_CLEARANCE_CSS =
  `var(--sf-mobile-nav-clearance, ${SF_MOBILE_NAV_CLEARANCE_FALLBACK})`;

/** z-index stack (also mirrored as CSS vars on storefront roots). */
export const SF_Z = {
  sheetBackdrop: 70,
  sheet: 75,
  mobileNav: 90,
  /** Filter chrome / scroll host while a sheet is open. */
  catalogOverlayElevated: 100,
  /** Tab bar while overlay open — must stay above catalogOverlayElevated. */
  mobileNavWhenOverlayOpen: 110,
} as const;

/** Effective mobile filter field font-size (iOS auto-zoom threshold). */
export const CATALOG_MOBILE_INPUT_FONT_PX = 16;
