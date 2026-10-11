import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  catalogViewModeStorageKey,
  catalogViewToggleAria,
  loadCatalogViewMode,
  persistCatalogViewMode,
} from "@/lib/storefront/catalog-view-mode";

const webRoot = resolve(__dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

describe("CatalogViewToggle", () => {
  it("is an icon-only switch showing the target mode icon and dynamic aria-label", () => {
    const source = readSrc("components/storefront/catalog-view-toggle.tsx");
    expect(source).toContain("data-catalog-view-toggle");
    expect(source).toContain("data-catalog-view-mode");
    expect(source).toContain("data-catalog-view-next");
    expect(source).toContain("CATALOG_VIEW_TOGGLE_CLASS");
    expect(source).toContain("IconGrid");
    expect(source).toContain("IconList");
    expect(source).toContain("catalogViewToggleAria");
    expect(source).toContain("onChange(nextMode)");
    expect(source).not.toContain("createPortal");
    expect(source).not.toContain("listbox");
    expect(source).not.toContain("IconChevronDown");
    expect(source).not.toContain("Vizualizare");

    expect(catalogViewToggleAria("grid")).toEqual({
      "aria-label": "Schimbă în vizualizare listă",
      title: "Schimbă în vizualizare listă",
    });
    expect(catalogViewToggleAria("list")).toEqual({
      "aria-label": "Schimbă în vizualizare grilă",
      title: "Schimbă în vizualizare grilă",
    });
  });

  it("results section wires square toggle + sort without view dropdown or Salvează CTA", () => {
    const toolbar = readSrc("components/storefront/catalog-results-section.tsx");
    expect(toolbar).toContain("CatalogViewToggle");
    expect(toolbar).toContain("CatalogSortMenu");
    expect(toolbar).toContain("persistCatalogViewMode");
    expect(toolbar).toContain("data-catalog-results-count");
    expect(toolbar).toContain("data-catalog-results-controls");
    expect(toolbar).toContain("gap-2.5");
    expect(toolbar).toContain("whitespace-nowrap");
    expect(toolbar).not.toContain("CatalogViewMenu");
    expect(toolbar).not.toContain("aria-haspopup");
    expect(toolbar).not.toContain("publicSavedPath");
    expect(toolbar).not.toMatch(/>\s*Salvează\s*</);
    expect(toolbar).not.toMatch(/>\s*Vizualizare\s*</);
  });

  it("keeps per-tenant localStorage isolation for view mode", () => {
    const store = new Map<string, string>();
    const g = globalThis as typeof globalThis & {
      window?: unknown;
      localStorage?: Storage;
    };
    const prevWindow = g.window;
    const prevStorage = g.localStorage;
    const fakeStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    g.window = globalThis;
    g.localStorage = fakeStorage;
    try {
      persistCatalogViewMode("acme", "list");
      persistCatalogViewMode("beta", "grid");
      expect(loadCatalogViewMode("acme")).toBe("list");
      expect(loadCatalogViewMode("beta")).toBe("grid");
      expect(store.get(catalogViewModeStorageKey("acme"))).toBe("list");
      expect(store.get(catalogViewModeStorageKey("beta"))).toBe("grid");
    } finally {
      if (prevWindow === undefined) delete g.window;
      else g.window = prevWindow;
      if (prevStorage === undefined) delete g.localStorage;
      else g.localStorage = prevStorage;
    }
  });
});
