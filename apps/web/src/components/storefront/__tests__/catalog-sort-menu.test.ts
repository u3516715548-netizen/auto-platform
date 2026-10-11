import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCatalogHref,
  CATALOG_SORT_VALUES,
  DEFAULT_CATALOG_QUERY,
  type CatalogQuery,
} from "@/lib/storefront/catalog-query";
import { CATALOG_SORT_SHORT_LABELS_RO } from "@/components/storefront/catalog-sort-menu";
import {
  CATALOG_TOOLBAR_MENU_PANEL_CLASS,
  computeCatalogToolbarMenuBox,
} from "@/lib/storefront/catalog-toolbar-menu";

const webRoot = resolve(__dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

describe("CatalogSortMenu", () => {
  it("exposes aria-expanded / listbox contract and supported sort options only", () => {
    const source = readSrc("components/storefront/catalog-sort-menu.tsx");
    expect(source).toContain('aria-haspopup="listbox"');
    expect(source).toContain("aria-expanded={open}");
    expect(source).toContain('role="listbox"');
    expect(source).toContain('role="option"');
    expect(source).toContain("aria-selected");
    expect(source).toContain("data-catalog-sort-trigger");
    expect(source).toContain("data-catalog-sort-menu");
    expect(source).toContain("CATALOG_SORT_VALUES");
    expect(source).toContain("buildCatalogHref");
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("ArrowDown");
    expect(source).toContain("data-placement={menuBox.placement}");
    expect(source).toContain('position: "fixed"');
    expect(source).toContain("createPortal");
    expect(source).toContain("getCatalogToolbarMenuPortalRoot");
  });

  it("uses opaque white panel chrome with per-option icons and active check", () => {
    const source = readSrc("components/storefront/catalog-sort-menu.tsx");
    expect(source).toContain("CATALOG_TOOLBAR_MENU_PANEL_CLASS");
    expect(source).toContain('backgroundColor: "#ffffff"');
    expect(source).toContain("SORT_OPTION_ICONS");
    expect(source).toContain("IconClock");
    expect(source).toContain("IconArrowUp");
    expect(source).toContain("IconArrowDown");
    expect(source).toContain("IconCalendar");
    expect(source).toContain("IconGauge");
    expect(source).toContain("IconCheck");
    expect(source).toContain('data-catalog-sort-option-icon={value}');
    expect(CATALOG_TOOLBAR_MENU_PANEL_CLASS).toContain("bg-white");
    expect(CATALOG_TOOLBAR_MENU_PANEL_CLASS).toContain("text-zinc-900");
  });

  it("preserves other query params when changing sort", () => {
    const query: CatalogQuery = {
      ...DEFAULT_CATALOG_QUERY,
      make: ["Audi"],
      priceMax: 25_000,
      sort: "newest",
      page: 2,
    };
    for (const sort of CATALOG_SORT_VALUES) {
      const href = buildCatalogHref({ ...query, sort, page: 1 });
      expect(href).toContain("make=Audi");
      expect(href).toContain("priceMax=25000");
      if (sort === "newest") {
        expect(href).not.toContain("sort=");
      } else {
        expect(href).toContain(`sort=${sort}`);
      }
      expect(href).not.toContain("page=");
    }
  });

  it("uses short labels including Recente for newest", () => {
    expect(CATALOG_SORT_SHORT_LABELS_RO.newest).toBe("Recente");
    expect(Object.keys(CATALOG_SORT_SHORT_LABELS_RO).sort()).toEqual(
      [...CATALOG_SORT_VALUES].sort(),
    );
  });

  it("prefers opening above the trigger on mobile viewports", () => {
    const menuHelper = readSrc("lib/storefront/catalog-toolbar-menu.ts");
    expect(menuHelper).toContain("max-width: 767px");
    expect(menuHelper).toContain('placeAbove');
    expect(menuHelper).toContain("260");

    const g = globalThis as typeof globalThis & {
      window?: {
        innerHeight: number;
        innerWidth: number;
        matchMedia: (q: string) => { matches: boolean };
      };
    };
    const prev = g.window;
    g.window = {
      innerHeight: 812,
      innerWidth: 375,
      matchMedia: (query: string) => ({
        matches: query.includes("max-width: 767px"),
      }),
    };
    try {
      const rect = {
        top: 420,
        bottom: 460,
        left: 40,
        width: 160,
        height: 40,
        right: 200,
        x: 40,
        y: 420,
        toJSON() {
          return this;
        },
      } as DOMRect;
      const box = computeCatalogToolbarMenuBox(rect);
      expect(box.placement).toBe("above");
      expect(box.width).toBeLessThanOrEqual(260);
      expect(box.width).toBeGreaterThanOrEqual(200);
    } finally {
      if (prev === undefined) {
        delete g.window;
      } else {
        g.window = prev;
      }
    }
  });
});
