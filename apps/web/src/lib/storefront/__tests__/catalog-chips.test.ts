import { describe, expect, it } from "vitest";
import {
  buildCatalogChips,
  buildPaginationItems,
  catalogQueryHasFilterChips,
  catalogResultsLabel,
  hrefWithoutChip,
  queryWithoutChip,
  resetCatalogHref,
} from "../catalog-chips";
import {
  buildCatalogHref,
  DEFAULT_CATALOG_QUERY,
  parseCatalogSearchParams,
  type CatalogQuery,
} from "../catalog-query";

function baseQuery(overrides: Partial<CatalogQuery> = {}): CatalogQuery {
  return { ...DEFAULT_CATALOG_QUERY, ...overrides };
}

describe("Etapa 8B catalog chips + pagination hrefs", () => {
  it("builds chips for filters but not for default sort or page", () => {
    const chips = buildCatalogChips(
      baseQuery({
        q: "golf",
        fuel: ["diesel", "hybrid"],
        sort: "price_asc",
        page: 3,
      }),
    );
    expect(chips.map((c) => c.id)).toEqual(["q", "fuel:diesel", "fuel:hybrid"]);
    expect(catalogQueryHasFilterChips(baseQuery({ sort: "price_asc", page: 2 }))).toBe(false);
    expect(catalogQueryHasFilterChips(baseQuery({ q: "x" }))).toBe(true);
  });

  it("removes a single repeated fuel and keeps the other filters", () => {
    const query = baseQuery({
      q: "golf",
      fuel: ["diesel", "hybrid"],
      bodyType: ["suv"],
      sort: "year_desc",
      page: 4,
    });
    const chips = buildCatalogChips(query);
    const dieselChip = chips.find((c) => c.id === "fuel:diesel");
    expect(dieselChip).toBeTruthy();
    const next = queryWithoutChip(query, dieselChip!);
    expect(next.fuel).toEqual(["hybrid"]);
    expect(next.bodyType).toEqual(["suv"]);
    expect(next.q).toBe("golf");
    expect(next.sort).toBe("year_desc");
    expect(next.page).toBe(1);

    const href = hrefWithoutChip(query, dieselChip!);
    expect(href).toContain("fuel=hybrid");
    expect(href).not.toContain("fuel=diesel");
    expect(href).toContain("bodyType=suv");
    expect(href).toContain("q=golf");
    expect(href).toContain("sort=year_desc");
    expect(href).not.toContain("page=");
  });

  it("pagination links preserve filters and sort", () => {
    const query = baseQuery({
      fuel: ["diesel"],
      sort: "price_asc",
      page: 2,
    });
    const next = buildCatalogHref({ ...query, page: 3 });
    expect(next).toContain("fuel=diesel");
    expect(next).toContain("sort=price_asc");
    expect(next).toContain("page=3");
  });

  it("reset goes to bare /", () => {
    expect(resetCatalogHref()).toBe("/");
  });

  it("formats results label and pagination window", () => {
    expect(catalogResultsLabel(0)).toBe("0 vehicule găsite");
    expect(catalogResultsLabel(1)).toBe("1 vehicul găsit");
    expect(catalogResultsLabel(12)).toBe("12 vehicule găsite");
    expect(buildPaginationItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPaginationItems(5, 12)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 12]);
  });

  it("round-trips query values used to prepopulate CatalogFilters", () => {
    const query = baseQuery({
      q: "Golf",
      priceMin: 5000,
      priceMax: 20000,
      yearMin: 2018,
      yearMax: 2022,
      kmMin: 10000,
      kmMax: 120000,
      fuel: ["diesel", "hybrid"],
      transmission: ["automatic"],
      bodyType: ["suv", "sedan"],
      sort: "price_asc",
      page: 2,
    });
    const href = buildCatalogHref(query);
    const parsed = parseCatalogSearchParams(new URL(href, "http://local.test").searchParams);
    expect(parsed.q).toBe("Golf");
    expect(parsed.priceMin).toBe(5000);
    expect(parsed.priceMax).toBe(20000);
    expect(parsed.yearMin).toBe(2018);
    expect(parsed.yearMax).toBe(2022);
    expect(parsed.kmMin).toBe(10000);
    expect(parsed.kmMax).toBe(120000);
    expect(parsed.fuel).toEqual(["diesel", "hybrid"]);
    expect(parsed.transmission).toEqual(["automatic"]);
    expect(parsed.bodyType).toEqual(["suv", "sedan"]);
    expect(parsed.sort).toBe("price_asc");
    expect(parsed.page).toBe(2);
  });
});
