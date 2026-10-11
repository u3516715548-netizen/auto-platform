import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = resolve(__dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

describe("catalog mobile UI polish (post-24C)", () => {
  it("keeps CTA above bottom nav via footer padding clearance", () => {
    const css = readSrc("app/globals.css");
    const shell = readSrc("components/storefront/catalog-sheet-shell.tsx");
    const layout = readSrc("lib/storefront/mobile-nav-layout.ts");

    expect(css).toMatch(
      /\.catalog-filter-sheet-footer\s*\{[^}]*padding-bottom:\s*var\(\s*--sf-mobile-nav-clearance/s,
    );
    expect(shell).toContain('data-sheet-nav-clearance="true"');
    expect(shell).toContain("SF_MOBILE_NAV_CLEARANCE_CSS");
    expect(shell).toContain("catalog-filter-sheet-footer");
    expect(layout).toContain("4rem");
    expect(layout).toContain("safe-area-inset-bottom");
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
