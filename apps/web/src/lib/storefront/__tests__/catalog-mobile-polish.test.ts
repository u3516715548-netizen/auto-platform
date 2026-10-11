import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = resolve(__dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

describe("catalog mobile UI polish (post-24C)", () => {
  it("keeps CTA above bottom nav via sheet lift + short footer gap", () => {
    const css = readSrc("app/globals.css");
    const shell = readSrc("components/storefront/catalog-sheet-shell.tsx");
    const layout = readSrc("lib/storefront/mobile-nav-layout.ts");

    expect(css).toContain("--sf-filter-sheet-footer-gap");
    expect(css).toMatch(
      /\.catalog-filter-sheet-drag\s*\{[^}]*margin-bottom:\s*var\(\s*--sf-mobile-nav-clearance/s,
    );
    expect(css).toMatch(
      /\.catalog-filter-sheet-footer\s*\{[^}]*padding-bottom:\s*var\(\s*--sf-filter-sheet-footer-gap/s,
    );
    expect(css).not.toMatch(
      /\.catalog-filter-sheet-footer\s*\{[^}]*padding-bottom:\s*var\(\s*--sf-mobile-nav-clearance/s,
    );
    expect(shell).toContain('data-sheet-nav-clearance="true"');
    expect(shell).toContain("catalog-filter-sheet-drag");
    expect(shell).toContain("catalog-filter-sheet-footer");
    expect(shell).not.toContain("SF_MOBILE_NAV_CLEARANCE_CSS");
    expect(layout).toContain("4rem");
    expect(layout).toContain("safe-area-inset-bottom");
    expect(layout).toContain("SF_FILTER_SHEET_FOOTER_GAP_CSS");
  });

  it("compacts mobile grid cards: hide Compară, Info rate, keep list/desktop", () => {
    const list = readSrc("components/storefront/public-vehicle-list.tsx");
    const actions = readSrc("components/storefront/vehicle-list-actions.tsx");
    const rate = readSrc("components/storefront/vehicle-card-rate.tsx");

    expect(list).toContain("line-clamp-2");
    expect(list).toContain("whitespace-nowrap");
    expect(list).toContain('density="grid-mobile"');
    expect(list).toContain("compactMobile");
    expect(list).toContain('data-catalog-layout="grid-card"');
    expect(list).toContain('data-catalog-layout="list-row"');
    expect(list).toContain("VehicleListActions");
    expect(list).toContain("VehicleCardCompareButton");
    expect(actions).toContain("data-catalog-bookmark");
    expect(actions).toContain('density === "grid-mobile"');
    expect(actions).toContain("max-md:hidden");
    expect(actions).toContain("aria-label");
    expect(rate).toContain("data-catalog-rate-info");
    expect(rate).toContain("data-catalog-rate-popover");
  });

  it("toolbar stacks result lines left with square toggle and sort on the right", () => {
    const toolbar = readSrc("components/storefront/catalog-results-section.tsx");
    const helpers = readSrc("lib/storefront/catalog-toolbar-menu.ts");
    expect(toolbar).toContain("whitespace-nowrap");
    expect(toolbar).toContain("data-catalog-results-count");
    expect(toolbar).toContain("data-catalog-results-controls");
    expect(toolbar).toContain("justify-between");
    expect(toolbar).toContain("gap-2.5");
    expect(toolbar).toContain("CatalogViewToggle");
    expect(toolbar).toContain("CatalogSortMenu");
    expect(toolbar).not.toContain("CatalogViewMenu");
    expect(helpers).toContain("CATALOG_VIEW_TOGGLE_CLASS");
    expect(helpers).toContain("size-10");
  });
});
