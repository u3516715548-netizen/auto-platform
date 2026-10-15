import { describe, expect, it } from "vitest";
import {
  createTenantPageInputSchema,
  isSelfCanonicalPage,
  normalizeCanonicalPath,
  normalizeTenantLocalPath,
  resolvePageCanonicalPath,
  sanitizeLandingCatalogFilters,
  validateCmsPageForPublish,
} from "@auto-platform/types";
import {
  buildFaqPageJsonLd,
  buildItemListJsonLd,
} from "@/lib/seo/build-json-ld";
import { buildPublicCmsPageMetadata } from "@/lib/seo/build-page-metadata";

describe("Phase 6 content SEO — paths & canonical", () => {
  it("accepts relative local paths and rejects absolute / cross-tenant URLs", () => {
    expect(normalizeTenantLocalPath("/p/bmw-iasi")).toBe("/p/bmw-iasi");
    expect(normalizeTenantLocalPath("/vehicles/bmw-320")).toBe("/vehicles/bmw-320");
    expect(normalizeTenantLocalPath("/#contact")).toBe("/#contact");
    expect(normalizeTenantLocalPath("https://evil.test/p/x")).toBeNull();
    expect(normalizeTenantLocalPath("//evil.test/p/x")).toBeNull();
    expect(normalizeTenantLocalPath("/p/../x")).toBeNull();
  });

  it("canonical override is relative-only; invalid falls back to self", () => {
    expect(normalizeCanonicalPath("/p/masini-audi")).toBe("/p/masini-audi");
    expect(normalizeCanonicalPath("https://acme.test/p/x")).toBeNull();
    expect(resolvePageCanonicalPath("bmw-iasi", null)).toBe("/p/bmw-iasi");
    expect(resolvePageCanonicalPath("bmw-iasi", "https://other.test/p/x")).toBe("/p/bmw-iasi");
    expect(resolvePageCanonicalPath("bmw-iasi", "/p/alt")).toBe("/p/alt");
    expect(isSelfCanonicalPage("bmw-iasi", null)).toBe(true);
    expect(isSelfCanonicalPage("bmw-iasi", "/p/bmw-iasi")).toBe(true);
    expect(isSelfCanonicalPage("bmw-iasi", "/p/alt")).toBe(false);
  });
});

describe("Phase 6 content SEO — filters & publish gates", () => {
  it("rejects private filter keys", () => {
    expect(sanitizeLandingCatalogFilters({ tenant_id: "x", make: ["BMW"] })).toBeNull();
    expect(sanitizeLandingCatalogFilters({ vin: "WBA", make: ["BMW"] })).toBeNull();
    expect(sanitizeLandingCatalogFilters({ status: "available" })).toBeNull();
    const ok = sanitizeLandingCatalogFilters({ make: ["BMW"], fuel: ["diesel"] });
    expect(ok).toEqual({ make: ["BMW"], fuel: ["diesel"] });
  });

  it("blocks thin / inventory empty publish", () => {
    expect(
      validateCmsPageForPublish({
        title: "BMW",
        body: "scurt",
        seoDescription: "meta prea scurta",
        pageKind: "custom",
      }),
    ).toMatch(/scurt|Meta/i);

    expect(
      validateCmsPageForPublish({
        title: "BMW București",
        intro: "Dealerul nostru oferă stoc BMW verificat în București cu garanție.",
        body: "Consultanții noștri te ajută să alegi modelul potrivit din inventarul curent.",
        seoDescription: "Stoc BMW în București — mașini verificate, finanțare și garanție.",
        pageKind: "brand_inventory",
        catalogFilters: {},
        inventoryVehicleCount: 0,
      }),
    ).toMatch(/filtre/i);

    expect(
      validateCmsPageForPublish({
        title: "BMW București",
        intro: "Dealerul nostru oferă stoc BMW verificat în București cu garanție.",
        body: "Consultanții noștri te ajută să alegi modelul potrivit din inventarul curent.",
        seoDescription: "Stoc BMW în București — mașini verificate, finanțare și garanție.",
        pageKind: "brand_inventory",
        catalogFilters: { make: ["BMW"] },
        inventoryVehicleCount: 0,
      }),
    ).toMatch(/fără vehicule/i);

    expect(
      validateCmsPageForPublish({
        title: "BMW București",
        intro: "Dealerul nostru oferă stoc BMW verificat în București cu garanție.",
        body: "Consultanții noștri te ajută să alegi modelul potrivit din inventarul curent.",
        seoDescription: "Stoc BMW în București — mașini verificate, finanțare și garanție.",
        pageKind: "brand_inventory",
        catalogFilters: { make: ["BMW"] },
        inventoryVehicleCount: 3,
      }),
    ).toBeNull();
  });

  it("create schema accepts landing kinds and strips absolute canonical", () => {
    const ok = createTenantPageInputSchema.safeParse({
      title: "Finanțare auto",
      slug: "finantare-auto",
      body: "Text editorial suficient de lung pentru draft.",
      pageKind: "financing",
      seoDescription: "Află opțiunile de finanțare pentru mașinile din stocul dealerului.",
      intro: "Intro despre finanțare.",
      includeInSitemap: true,
      noindex: false,
      faqJson: "[]",
      catalogFiltersJson: "{}",
      internalLinksJson: '[{"label":"Stoc","path":"/"}]',
      canonicalPath: "/p/finantare-auto",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.pageKind).toBe("financing");
      expect(ok.data.canonicalPath).toBe("/p/finantare-auto");
      expect(ok.data.internalLinks[0]?.path).toBe("/");
    }

    const badCanon = createTenantPageInputSchema.safeParse({
      title: "X",
      slug: "pagina-x",
      body: "body",
      pageKind: "custom",
      canonicalPath: "https://other.test/p/x",
      faqJson: "[]",
      catalogFiltersJson: "{}",
      internalLinksJson: "[]",
    });
    expect(badCanon.success).toBe(false);
  });
});

describe("Phase 6 content SEO — metadata & JSON-LD", () => {
  const page = {
    slug: "bmw-iasi",
    title: "BMW Iași",
    body: "Conținut",
    pageKind: "brand_inventory" as const,
    seoDescription: "Stoc BMW în Iași cu finanțare și garanție dealer.",
    canonicalPath: "/p/bmw-iasi",
    noindex: false,
    includeInSitemap: true,
    faq: [{ question: "Oferiți garanție?", answer: "Da, pe stocul selectat." }],
    catalogFilters: { make: ["BMW"] },
    internalLinks: [{ label: "Stoc", path: "/" }],
  };

  it("metadata uses self canonical and page noindex", () => {
    const meta = buildPublicCmsPageMetadata({
      page,
      dealerName: "ACME",
      seo: { indexingEnabled: true },
      origin: "https://acme.example.com",
    });
    expect(meta.alternates).toEqual({ canonical: "/p/bmw-iasi" });
    expect(meta.openGraph?.url).toBe("https://acme.example.com/p/bmw-iasi");
    expect(meta.robots).toEqual({ index: true, follow: true });

    const blocked = buildPublicCmsPageMetadata({
      page: { ...page, noindex: true },
      dealerName: "ACME",
      seo: { indexingEnabled: true },
    });
    expect(blocked.robots).toEqual({ index: false, follow: true });
  });

  it("FAQPage and ItemList only when content exists", () => {
    expect(buildFaqPageJsonLd([], "https://acme.example.com", "/p/x")).toBeNull();
    expect(
      buildFaqPageJsonLd(page.faq, "https://acme.example.com", "/p/bmw-iasi")?.["@type"],
    ).toBe("FAQPage");
    expect(
      buildItemListJsonLd({
        name: "BMW",
        origin: "https://acme.example.com",
        path: "/p/bmw-iasi",
        items: [],
      }),
    ).toBeNull();
    expect(
      buildItemListJsonLd({
        name: "BMW",
        origin: "https://acme.example.com",
        path: "/p/bmw-iasi",
        items: [{ name: "BMW 320", path: "/vehicles/bmw-320" }],
      })?.["@type"],
    ).toBe("ItemList");
  });
});
