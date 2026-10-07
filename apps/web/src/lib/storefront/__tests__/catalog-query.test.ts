import { describe, expect, it } from "vitest";
import {
  CATALOG_FORBIDDEN_PARAM_KEYS,
  CATALOG_PAGE_SIZE,
  buildCatalogHref,
  catalogQueryHasFilters,
  catalogQueryToSearchParams,
  clampCatalogPage,
  escapeIlikePattern,
  parseCatalogSearchParams,
} from "../catalog-query";

describe("Etapa 8A catalog query parse", () => {
  it("applies defaults for empty params", () => {
    const q = parseCatalogSearchParams({});
    expect(q).toEqual({
      q: null,
      make: [],
      priceMin: null,
      priceMax: null,
      yearMin: null,
      yearMax: null,
      kmMin: null,
      kmMax: null,
      fuel: [],
      transmission: [],
      bodyType: [],
      sort: "newest",
      page: 1,
    });
    expect(catalogQueryHasFilters(q)).toBe(false);
    expect(CATALOG_PAGE_SIZE).toBe(12);
  });

  it("parses repeated multi-select enums and drops invalids", () => {
    const sp = new URLSearchParams();
    sp.append("fuel", "diesel");
    sp.append("fuel", "hybrid");
    sp.append("fuel", "evil");
    sp.append("fuel", "diesel");
    sp.append("bodyType", "suv");
    sp.append("transmission", "automatic");
    sp.append("transmission", "nope");
    const q = parseCatalogSearchParams(sp);
    expect(q.fuel).toEqual(["diesel", "hybrid"]);
    expect(q.bodyType).toEqual(["suv"]);
    expect(q.transmission).toEqual(["automatic"]);
  });

  it("swaps inverted ranges and clamps page", () => {
    const q = parseCatalogSearchParams({
      priceMin: "30000",
      priceMax: "10000",
      yearMin: "2024",
      yearMax: "2018",
      kmMin: "100",
      kmMax: "50",
      page: "0",
    });
    expect(q.priceMin).toBe(10000);
    expect(q.priceMax).toBe(30000);
    expect(q.yearMin).toBe(2018);
    expect(q.yearMax).toBe(2024);
    expect(q.kmMin).toBe(50);
    expect(q.kmMax).toBe(100);
    expect(q.page).toBe(1);
    expect(clampCatalogPage(99, 25)).toBe(3);
    expect(clampCatalogPage(0, 25)).toBe(1);
  });

  it("sanitizes q length and escapes ILIKE wildcards", () => {
    const q = parseCatalogSearchParams({ q: `  golf%_  ${"x".repeat(100)}` });
    expect(q.q?.length).toBeLessThanOrEqual(80);
    expect(q.q?.startsWith("golf")).toBe(true);
    expect(escapeIlikePattern("100%_safe\\")).toBe("100\\%\\_safe\\\\");
  });

  it("allowlists sort and ignores forbidden client keys", () => {
    expect(parseCatalogSearchParams({ sort: "price_asc" }).sort).toBe("price_asc");
    expect(parseCatalogSearchParams({ sort: "hack" }).sort).toBe("newest");
    const q = parseCatalogSearchParams({
      tenant_id: "00000000-0000-4000-8000-000000000099",
      status: "draft",
      vin: "WVWZZZ",
      limit: "999",
      pageSize: "50",
      q: "golf",
    });
    expect(q.q).toBe("golf");
    expect(q).not.toHaveProperty("tenant_id");
    expect(q).not.toHaveProperty("status");
    expect(q).not.toHaveProperty("vin");
    expect(q).not.toHaveProperty("limit");
    for (const key of CATALOG_FORBIDDEN_PARAM_KEYS) {
      expect(Object.keys(q)).not.toContain(key);
    }
  });

  it("serializes shareable href without defaults or secrets", () => {
    const href = buildCatalogHref({
      q: "golf",
      make: [],
      priceMin: 10000,
      priceMax: null,
      yearMin: null,
      yearMax: null,
      kmMin: null,
      kmMax: null,
      fuel: ["diesel", "hybrid"],
      transmission: [],
      bodyType: ["suv"],
      sort: "price_asc",
      page: 2,
    });
    expect(href).toContain("q=golf");
    expect(href).toContain("fuel=diesel");
    expect(href).toContain("fuel=hybrid");
    expect(href).toContain("bodyType=suv");
    expect(href).toContain("sort=price_asc");
    expect(href).toContain("page=2");
    expect(href).not.toContain("tenant");
    expect(href).not.toContain("status");
    expect(href).not.toContain("limit");
    expect(href).not.toContain("pageSize");

    const empty = catalogQueryToSearchParams({
      q: null,
      priceMin: null,
      priceMax: null,
      yearMin: null,
      yearMax: null,
      kmMin: null,
      kmMax: null,
      fuel: [],
      transmission: [],
      bodyType: [],
      sort: "newest",
      page: 1,
    });
    expect(empty.toString()).toBe("");
    expect(buildCatalogHref(parseCatalogSearchParams({}))).toBe("/");
  });
});
