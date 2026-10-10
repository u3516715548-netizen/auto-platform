import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CATALOG_LIST_BODY_CLASS,
  CATALOG_LIST_CARD_CLASS,
  CATALOG_LIST_MEDIA_CLASS,
  catalogViewModeStorageKey,
  catalogViewToggleAria,
  catalogVehicleListClassName,
  DEFAULT_CATALOG_VIEW_MODE,
  loadCatalogViewMode,
  parseCatalogViewMode,
  persistCatalogViewMode,
} from "@/lib/storefront/catalog-view-mode";

function mockLocalStorage(store: Map<string, string>) {
  const localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("localStorage", localStorage);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("catalog view mode storage", () => {
  it("defaults to grid when no preference is stored", () => {
    expect(DEFAULT_CATALOG_VIEW_MODE).toBe("grid");
    expect(parseCatalogViewMode(null)).toBe("grid");
    expect(parseCatalogViewMode(undefined)).toBe("grid");
    expect(parseCatalogViewMode("")).toBe("grid");
    expect(parseCatalogViewMode("evil")).toBe("grid");

    const store = new Map<string, string>();
    mockLocalStorage(store);
    expect(loadCatalogViewMode("acme")).toBe("grid");
  });

  it("persists list and restores after remount/refresh simulation", () => {
    const store = new Map<string, string>();
    mockLocalStorage(store);

    persistCatalogViewMode("acme", "list");
    expect(store.get(catalogViewModeStorageKey("acme"))).toBe("list");
    expect(loadCatalogViewMode("acme")).toBe("list");

    // Remount: new load from same storage
    expect(loadCatalogViewMode("acme")).toBe("list");

    persistCatalogViewMode("acme", "grid");
    expect(loadCatalogViewMode("acme")).toBe("grid");
  });

  it("isolates preference per tenant slug (ACME ≠ Beta)", () => {
    const store = new Map<string, string>();
    mockLocalStorage(store);

    persistCatalogViewMode("acme", "list");
    persistCatalogViewMode("beta", "grid");

    expect(catalogViewModeStorageKey("acme")).toBe("ap.sf.catalog-view.v1.acme");
    expect(catalogViewModeStorageKey("beta")).toBe("ap.sf.catalog-view.v1.beta");
    expect(catalogViewModeStorageKey("acme")).not.toBe(catalogViewModeStorageKey("beta"));
    expect(loadCatalogViewMode("acme")).toBe("list");
    expect(loadCatalogViewMode("beta")).toBe("grid");
  });

  it("falls back to grid when localStorage throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(loadCatalogViewMode("acme")).toBe("grid");
    expect(() => persistCatalogViewMode("acme", "list")).not.toThrow();
  });

  it("falls back to grid when window is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(loadCatalogViewMode("acme")).toBe("grid");
  });
});

describe("catalog view toggle a11y + layout semantics", () => {
  it("sets aria-pressed for the active mode", () => {
    expect(catalogViewToggleAria("grid", "grid")).toEqual({
      "aria-pressed": true,
      "aria-label": "Vizualizare grid",
    });
    expect(catalogViewToggleAria("grid", "list")).toEqual({
      "aria-pressed": false,
      "aria-label": "Vizualizare listă",
    });
    expect(catalogViewToggleAria("list", "list")["aria-pressed"]).toBe(true);
    expect(catalogViewToggleAria("list", "grid")["aria-pressed"]).toBe(false);
  });

  it("uses 2-col mobile and 3-col desktop grid classes", () => {
    const grid = catalogVehicleListClassName("grid", false);
    expect(grid).toContain("grid-cols-2");
    expect(grid).toContain("lg:grid-cols-3");
    expect(grid).not.toContain("grid-cols-1");
  });

  it("list layout is vertical under lg and horizontal from lg", () => {
    const list = catalogVehicleListClassName("list", true);
    expect(list).toContain("flex");
    expect(list).toContain("flex-col");
    expect(list).toContain("md:mt-3");

    expect(CATALOG_LIST_CARD_CLASS).toContain("flex-col");
    expect(CATALOG_LIST_CARD_CLASS).toContain("lg:flex-row");
    expect(CATALOG_LIST_CARD_CLASS).not.toMatch(/(?:^|\s)flex-row(?:\s|$)/);
    expect(CATALOG_LIST_MEDIA_CLASS).toContain("w-full");
    expect(CATALOG_LIST_MEDIA_CLASS).toContain("lg:w-[38%]");
    expect(CATALOG_LIST_MEDIA_CLASS).not.toMatch(/(?:^|\s)w-\[38%\](?:\s|$)/);
    expect(CATALOG_LIST_BODY_CLASS).toContain("flex-1");
  });

  it("keeps Compară / Salvate action hooks in list card structure", () => {
    // VehicleListActions + VehicleCardCompareButton remain in PublicVehicleList
    // for both layouts — assert source still wires both.
    const source = readFileSync(
      resolve(__dirname, "../../../components/storefront/public-vehicle-list.tsx"),
      "utf8",
    );
    expect(source).toContain("VehicleListActions");
    expect(source).toContain("VehicleCardCompareButton");
    expect(source).toContain('data-catalog-layout="list-row"');
    expect(source).toContain('data-catalog-layout="grid-card"');
  });

  it("results toolbar has Grid/List/Sort only — no redundant Salvează CTA", () => {
    const toolbar = readFileSync(
      resolve(
        __dirname,
        "../../../components/storefront/catalog-results-section.tsx",
      ),
      "utf8",
    );
    expect(toolbar).toContain("data-catalog-view-toggle");
    expect(toolbar).toContain("sortHref");
    expect(toolbar).toContain("aria-label={sortAriaLabel}");
    expect(toolbar).not.toContain("publicSavedPath");
    expect(toolbar).not.toContain("IconBookmark");
    expect(toolbar).not.toMatch(/>\s*Salvează\s*</);

    const shell = readFileSync(
      resolve(__dirname, "../../../components/storefront/public-shell.tsx"),
      "utf8",
    );
    expect(shell).toContain("publicSavedPath");
    expect(shell).toContain("Salvate");
  });
});

describe("filter chrome white-corner regression", () => {
  it("T1/T2 filter host and toolbar use surface tokens, not hardcoded white", () => {
    const css = readFileSync(
      resolve(__dirname, "../../../app/globals.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\.catalog-scroll-filter-host\s*\{[^}]*background-color:\s*var\(--sf-surface/s,
    );
    expect(css).toMatch(
      /\.catalog-results-toolbar\s*\{[^}]*background-color:\s*var\(--sf-surface/s,
    );
    expect(css).toContain(
      ".storefront-template-2 .catalog-scroll-filter-host",
    );
    // Hardcoded white on the filter host was the T2 corner bug — must not remain.
    expect(css).not.toMatch(
      /\.catalog-scroll-filter-host\s*\{[^}]*background-color:\s*#ffffff/s,
    );
  });
});
