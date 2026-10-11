import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  catalogViewModeStorageKey,
  persistCatalogViewMode,
  loadCatalogViewMode,
} from "@/lib/storefront/catalog-view-mode";

const webRoot = resolve(__dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

describe("CatalogViewMenu", () => {
  it("exposes a single dropdown trigger with listbox a11y", () => {
    const source = readSrc("components/storefront/catalog-view-menu.tsx");
    expect(source).toContain('aria-haspopup="listbox"');
    expect(source).toContain("aria-expanded={open}");
    expect(source).toContain('role="listbox"');
    expect(source).toContain('role="option"');
    expect(source).toContain("data-catalog-view-trigger");
    expect(source).toContain("data-catalog-view-menu");
    expect(source).toContain('data-catalog-view-option={mode}');
    expect(source).toContain("createPortal");
    expect(source).toContain("getCatalogToolbarMenuPortalRoot");
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("ArrowDown");
    expect(source).toContain("IconGrid");
    expect(source).toContain("IconList");
    expect(source).toContain("IconCheck");
    expect(source).toContain('backgroundColor: "#ffffff"');
    expect(source).toContain("Vizualizare");
    expect(source).toContain("Grilă");
    expect(source).toContain("Listă");
  });

  it("results section wires view menu without dual toggle buttons or Salvează CTA", () => {
    const toolbar = readSrc("components/storefront/catalog-results-section.tsx");
    expect(toolbar).toContain("CatalogViewMenu");
    expect(toolbar).toContain("CatalogSortMenu");
    expect(toolbar).toContain("persistCatalogViewMode");
    expect(toolbar).toContain("whitespace-nowrap");
    expect(toolbar).toContain("data-catalog-results-count");
    expect(toolbar).toContain("min-[360px]:flex-row");
    expect(toolbar).not.toContain("data-catalog-view-toggle");
    expect(toolbar).not.toContain("aria-pressed");
    expect(toolbar).not.toContain("publicSavedPath");
    expect(toolbar).not.toMatch(/>\s*Salvează\s*</);
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
