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
    expect(source).toContain("zIndex: 120");
    expect(source).toContain("createPortal");
    expect(source).toContain("document.body");
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
});
