import { describe, expect, it } from "vitest";
import {
  normalizeSeoTitleTemplate,
  normalizeTwitterHandle,
  upsertTenantSeoSettingsInputSchema,
} from "@auto-platform/types";
import {
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildVehicleProductJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo/build-json-ld";
import {
  applySeoDefaultsToCatalogMetadata,
  buildForcedNoindexMetadata,
  buildPublicCmsPageMetadata,
  buildPublicVehiclePageMetadata,
} from "@/lib/seo/build-page-metadata";
import {
  isStablePublicImageUrl,
  toAbsolutePublicAssetUrl,
} from "@/lib/seo/public-origin";
import { applySeoTitleTemplate } from "@/lib/seo/title-template";
import { buildPublicCatalogMetadata } from "@/lib/storefront/catalog-seo";

describe("Phase 2 SEO Core — templates + validation", () => {
  it("normalizes title template and twitter handle", () => {
    expect(normalizeSeoTitleTemplate("%s | {dealer}")).toBe("%s | {dealer}");
    expect(normalizeSeoTitleTemplate("no placeholder")).toBeNull();
    expect(normalizeTwitterHandle("@Dealer_RO")).toBe("Dealer_RO");
    expect(normalizeTwitterHandle("bad handle!")).toBeNull();
  });

  it("applies title template with dealer substitution", () => {
    expect(applySeoTitleTemplate("BMW X5", "ACME", "%s | {dealer}")).toBe("BMW X5 | ACME");
    expect(applySeoTitleTemplate("BMW X5", "ACME", null)).toBe("BMW X5 | ACME");
  });

  it("upsert schema accepts OG + template fields", () => {
    const ok = upsertTenantSeoSettingsInputSchema.safeParse({
      seoTitleDefault: "ACME",
      seoDescriptionDefault: "Desc",
      faviconPath: "tenants/acme/favicon.ico",
      indexingEnabled: true,
      titleTemplate: "%s | {dealer}",
      ogImagePath: "https://cdn.example.com/og.jpg",
      twitterHandle: "@acme_cars",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.titleTemplate).toBe("%s | {dealer}");
      expect(ok.data.twitterHandle).toBe("acme_cars");
      expect(ok.data.ogImagePath).toBe("https://cdn.example.com/og.jpg");
    }

    expect(
      upsertTenantSeoSettingsInputSchema.safeParse({
        indexingEnabled: true,
        titleTemplate: "missing placeholder",
      }).success,
    ).toBe(false);
  });
});

describe("Phase 2 SEO Core — metadata + OG", () => {
  it("forces noindex on utility pages", () => {
    expect(buildForcedNoindexMetadata("Comparație").robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it("adds Open Graph + Twitter on CMS and catalog", () => {
    const cms = buildPublicCmsPageMetadata({
      page: {
        slug: "despre",
        title: "Despre",
        body: "",
        pageKind: "about",
        seoTitle: "Despre noi",
        canonicalPath: "/p/despre",
        noindex: false,
        includeInSitemap: true,
        faq: [],
        catalogFilters: {},
        internalLinks: [],
      },
      dealerName: "ACME",
      seo: {
        indexingEnabled: true,
        ogImagePath: "https://cdn.example.com/og.jpg",
        twitterHandle: "acme",
        titleTemplate: "%s | {dealer}",
      },
      origin: "https://acme.example.com",
    });
    expect(cms.title).toBe("Despre noi | ACME");
    expect(cms.openGraph?.url).toBe("https://acme.example.com/p/despre");
    expect(cms.openGraph?.images).toEqual([{ url: "https://cdn.example.com/og.jpg" }]);
    expect(cms.twitter?.site).toBe("@acme");

    const catalog = applySeoDefaultsToCatalogMetadata(
      buildPublicCatalogMetadata({ dealerName: "ACME", hasQuery: false }),
      {
        seoTitleDefault: "Stoc ACME",
        indexingEnabled: true,
        ogImagePath: "https://cdn.example.com/og.jpg",
      },
      "ACME",
      "https://acme.example.com",
    );
    expect(catalog.openGraph?.url).toBe("https://acme.example.com/");
    expect(catalog.metadataBase?.toString()).toBe("https://acme.example.com/");
  });

  it("vehicle metadata includes OG without using signed image URLs", () => {
    const meta = buildPublicVehiclePageMetadata({
      title: "BMW | ACME",
      description: "Desc",
      slug: "bmw-x5",
      seo: {
        indexingEnabled: true,
        ogImagePath: "https://cdn.example.com/og.jpg",
      },
      origin: "https://acme.example.com",
      pageImage: "https://storage.example.com/x.jpg?token=abc",
    });
    expect(meta.alternates).toEqual({ canonical: "/vehicles/bmw-x5" });
    expect(meta.openGraph?.images).toEqual([{ url: "https://cdn.example.com/og.jpg" }]);
  });
});

describe("Phase 2 SEO Core — JSON-LD + asset URLs", () => {
  it("rejects signed token URLs for stable images", () => {
    expect(isStablePublicImageUrl("https://cdn.example.com/a.jpg")).toBe(true);
    expect(isStablePublicImageUrl("https://x.supabase.co/a.jpg?token=secret")).toBe(false);
    expect(toAbsolutePublicAssetUrl("brand/og.jpg", "https://acme.example.com")).toBe(
      "https://acme.example.com/brand/og.jpg",
    );
  });

  it("builds Organization / WebSite / Breadcrumb without VIN", () => {
    const org = buildOrganizationJsonLd({
      dealerName: "ACME",
      origin: "https://acme.example.com",
      company: {
        tradingName: "ACME Motors",
        publicPhone: "+401234",
        city: "Iași",
        country: "RO",
        showroomAddress: "Str. Test 1",
      },
    });
    expect(org["@type"]).toEqual(["Organization", "AutoDealer"]);
    expect(JSON.stringify(org)).not.toMatch(/vin/i);

    expect(buildWebSiteJsonLd({ dealerName: "ACME", origin: "https://acme.example.com" })["@type"]).toBe(
      "WebSite",
    );

    const crumbs = buildBreadcrumbJsonLd(
      [
        { name: "Stoc", path: "/" },
        { name: "BMW", path: "/vehicles/bmw" },
      ],
      "https://acme.example.com",
    );
    expect((crumbs.itemListElement as unknown[]).length).toBe(2);
  });

  it("builds Product+Offer only with valid price; skips signed images", () => {
    const product = buildVehicleProductJsonLd({
      name: "BMW X5 2020",
      path: "/vehicles/bmw-x5",
      origin: "https://acme.example.com",
      price: "24900.5",
      currency: "EUR",
      imageUrl: "https://storage.example.com/x.jpg?token=x",
    });
    expect(product).not.toBeNull();
    expect(product?.["@type"]).toBe("Product");
    expect(product).not.toHaveProperty("image");
    expect((product?.offers as { price: string }).price).toBe("24900.50");
    expect(JSON.stringify(product)).not.toMatch(/vin/i);

    expect(
      buildVehicleProductJsonLd({
        name: "X",
        path: "/vehicles/x",
        origin: "https://acme.example.com",
        price: "not-a-number",
        currency: "EUR",
      }),
    ).toBeNull();
  });
});
