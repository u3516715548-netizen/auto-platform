import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clampSheetDragOffset,
  SHEET_DRAG_CLOSE_DISTANCE_PX,
  SHEET_DRAG_CLOSE_VELOCITY_PX_MS,
  SHEET_DRAG_MIN_DISTANCE_FOR_VELOCITY_PX,
  sheetDragVelocityPxPerMs,
  shouldCloseSheetFromDrag,
} from "@/lib/storefront/catalog-sheet-drag";
import {
  CATALOG_MOBILE_INPUT_FONT_PX,
  SF_MOBILE_NAV_CLEARANCE_CSS,
  SF_Z,
} from "@/lib/storefront/mobile-nav-layout";

const webRoot = resolve(__dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

describe("catalog sheet drag dismiss", () => {
  it("keeps sheet open when drag is under the distance threshold", () => {
    expect(
      shouldCloseSheetFromDrag({
        deltaY: SHEET_DRAG_CLOSE_DISTANCE_PX - 1,
        velocityY: 0,
      }),
    ).toBe(false);
    expect(
      shouldCloseSheetFromDrag({
        deltaY: 20,
        velocityY: 2,
      }),
    ).toBe(false);
  });

  it("closes when drag distance reaches the threshold", () => {
    expect(
      shouldCloseSheetFromDrag({
        deltaY: SHEET_DRAG_CLOSE_DISTANCE_PX,
        velocityY: 0,
      }),
    ).toBe(true);
    expect(
      shouldCloseSheetFromDrag({
        deltaY: 120,
        velocityY: 0,
      }),
    ).toBe(true);
  });

  it("closes on fast downward flick past the velocity floor", () => {
    expect(
      shouldCloseSheetFromDrag({
        deltaY: SHEET_DRAG_MIN_DISTANCE_FOR_VELOCITY_PX,
        velocityY: SHEET_DRAG_CLOSE_VELOCITY_PX_MS,
      }),
    ).toBe(true);
    expect(
      shouldCloseSheetFromDrag({
        deltaY: SHEET_DRAG_MIN_DISTANCE_FOR_VELOCITY_PX - 1,
        velocityY: 5,
      }),
    ).toBe(false);
  });

  it("ignores upward drag and clamps visual offset to downward only", () => {
    expect(clampSheetDragOffset(-40)).toBe(0);
    expect(clampSheetDragOffset(0)).toBe(0);
    expect(clampSheetDragOffset(55)).toBe(55);
    expect(sheetDragVelocityPxPerMs(100, 200)).toBe(0.5);
    expect(sheetDragVelocityPxPerMs(100, 0)).toBe(0);
    expect(sheetDragVelocityPxPerMs(100, 15)).toBe(0);
  });
});

describe("mobile filter sheet layout contracts", () => {
  it("uses a single shared nav clearance + z-index stack", () => {
    expect(CATALOG_MOBILE_INPUT_FONT_PX).toBe(16);
    expect(SF_MOBILE_NAV_CLEARANCE_CSS).toContain("--sf-mobile-nav-clearance");
    expect(SF_MOBILE_NAV_CLEARANCE_CSS).toContain("4rem");
    expect(SF_Z.sheet).toBeLessThan(SF_Z.mobileNav);
    expect(SF_Z.mobileNav).toBeLessThan(SF_Z.catalogOverlayElevated);
    expect(SF_Z.catalogOverlayElevated).toBeLessThan(
      SF_Z.mobileNavWhenOverlayOpen,
    );
  });

  it("wires drag handle + Escape + surface tokens in CatalogSheetShell", () => {
    const shell = readSrc("components/storefront/catalog-sheet-shell.tsx");
    expect(shell).toContain('data-sheet-drag-handle="true"');
    expect(shell).toContain('aria-label="Trage în jos pentru a închide"');
    expect(shell).toContain("onPointerDown");
    expect(shell).toContain("shouldCloseSheetFromDrag");
    expect(shell).toContain("prefers-reduced-motion");
    expect(shell).toContain("SF_MOBILE_NAV_CLEARANCE_CSS");
    expect(shell).toContain('data-sheet-nav-clearance="true"');
    expect(shell).toContain("catalog-filter-sheet-drag");
    expect(shell).toContain("bg-[var(--sf-surface)]");
    expect(shell).toContain('event.key === "Escape"');
    expect(shell).toContain("min(80dvh, 100svh)");
  });

  it("reuses CatalogSheetShell for mobile quick sheets and full drawer", () => {
    const quick = readSrc("components/storefront/catalog-quick-sheets.tsx");
    const drawer = readSrc("components/storefront/catalog-filter-drawer.tsx");
    expect(quick).toContain("CatalogSheetShell");
    expect(quick).not.toContain("MOBILE_NAV_CLEARANCE");
    expect(drawer).toContain("CatalogSheetShell");
    expect(drawer).not.toContain("MOBILE_NAV_CLEARANCE");
  });

  it("keeps mobile filter inputs at 16px effective size without blocking user zoom", () => {
    const filters = readSrc("components/storefront/catalog-filters.tsx");
    const quick = readSrc("components/storefront/catalog-quick-sheets.tsx");
    const drawer = readSrc("components/storefront/catalog-filter-drawer.tsx");
    const css = readSrc("app/globals.css");

    expect(filters).toContain("catalog-filter-mobile-field");
    expect(filters).toContain("text-base");
    expect(quick).toContain("catalog-filter-mobile-field");
    expect(quick).toContain("text-base");
    expect(drawer).toContain("catalog-filter-mobile-field");
    expect(css).toContain("font-size: 16px !important");
    expect(css).not.toContain("user-scalable=no");
    expect(css).not.toContain("maximum-scale=1");
  });

  it("keeps bottom nav above sheets via shared CSS vars and overlay lift", () => {
    const css = readSrc("app/globals.css");
    const shell = readSrc("components/storefront/public-shell.tsx");

    expect(css).toContain("--sf-mobile-nav-clearance");
    expect(css).toContain("4rem");
    expect(css).toContain("--sf-z-mobile-nav");
    expect(css).toContain("--sf-z-modal");
    expect(css).toContain(
      'body[data-sf-catalog-overlay="open"] .sf-mobile-nav',
    );
    expect(css).toContain(".catalog-filter-sheet-footer");
    expect(css).toContain("padding-bottom: var(");
    expect(css).toContain("--sf-mobile-nav-clearance");
    expect(shell).toContain("sf-mobile-nav");
    expect(shell).toContain("env(safe-area-inset-bottom");
  });
});
