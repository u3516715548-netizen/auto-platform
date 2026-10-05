import { describe, expect, it } from "vitest";
import {
  buildPublicCatalogMetadata,
  catalogUrlHasQueryString,
} from "../catalog-seo";
import {
  catalogDrawerBodyOverflow,
  resolveFocusTrapIndex,
} from "../catalog-drawer-a11y";
import {
  countActiveCatalogFilters,
  resetCatalogHref,
} from "../catalog-chips";
import {
  buildCatalogHref,
  catalogQueryToSearchParams,
  DEFAULT_CATALOG_QUERY,
  type CatalogQuery,
} from "../catalog-query";

function baseQuery(overrides: Partial<CatalogQuery> = {}): CatalogQuery {
  return { ...DEFAULT_CATALOG_QUERY, ...overrides };
}

describe("Etapa 8C catalog SEO", () => {
  it("clean catalog URL is indexable with canonical /", () => {
    expect(catalogUrlHasQueryString({})).toBe(false);
    const meta = buildPublicCatalogMetadata({
      dealerName: "ACME Auto",
      hasQuery: false,
    });
    expect(meta.title).toBe("ACME Auto — Stoc auto");
    expect(meta.description).toBe("Descoperă vehiculele disponibile la ACME Auto.");
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates).toEqual({ canonical: "/" });
    expect(String(meta.title)).not.toContain("golf");
  });

  it("any query string is noindex with canonical / and no search terms in metadata", () => {
    expect(catalogUrlHasQueryString({ q: "golf" })).toBe(true);
    expect(catalogUrlHasQueryString({ page: "2" })).toBe(true);
    const meta = buildPublicCatalogMetadata({
      dealerName: "ACME Auto",
      hasQuery: true,
    });
    expect(meta.title).toBe("ACME Auto — Stoc auto — Căutare");
    expect(meta.description).toBe("Descoperă vehiculele disponibile la ACME Auto.");
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates).toEqual({ canonical: "/" });
    expect(JSON.stringify(meta)).not.toContain("golf");
  });
});

describe("Etapa 8C drawer helpers", () => {
  it("counts active filter chips for the mobile trigger badge", () => {
    expect(countActiveCatalogFilters(baseQuery())).toBe(0);
    expect(
      countActiveCatalogFilters(
        baseQuery({
          q: "golf",
          fuel: ["diesel", "hybrid"],
          sort: "price_asc",
          page: 3,
        }),
      ),
    ).toBe(3);
  });

  it("serializes drawer/GET apply without page and with repeated multi-select", () => {
    const applied = baseQuery({
      fuel: ["diesel", "hybrid"],
      bodyType: ["suv"],
      sort: "year_desc",
      page: 4,
    });
    // Form omit page → page 1; serialize drops default page.
    const sp = catalogQueryToSearchParams({ ...applied, page: 1 });
    expect(sp.getAll("fuel")).toEqual(["diesel", "hybrid"]);
    expect(sp.get("bodyType")).toBe("suv");
    expect(sp.get("sort")).toBe("year_desc");
    expect(sp.has("page")).toBe(false);
    expect(buildCatalogHref({ ...applied, page: 1 })).not.toContain("page=");
    expect(resetCatalogHref()).toBe("/");
  });

  it("focus trap wraps and body overflow locks while open", () => {
    expect(resolveFocusTrapIndex(0, 5, true)).toBe(4);
    expect(resolveFocusTrapIndex(4, 5, false)).toBe(0);
    expect(resolveFocusTrapIndex(2, 5, false)).toBeNull();
    expect(resolveFocusTrapIndex(2, 5, true)).toBeNull();
    expect(catalogDrawerBodyOverflow(true)).toBe("hidden");
    expect(catalogDrawerBodyOverflow(false)).toBe("");
  });
});
