import { describe, expect, it } from "vitest";
import { evaluateSeoHealth } from "@/lib/seo/health/evaluate-seo-health";
import { summarizeSeoHealth, sortSeoHealthIssues } from "@/lib/seo/health/summarize";
import type { MarketingIntegrationsForForm } from "@/lib/marketing/get-marketing-integrations";
import { SETTINGS_OWNER_ROLES, canAccessSettingsOwnerSection } from "@/lib/dashboard/settings-nav";
import { SETTINGS_NAV } from "@/lib/dashboard/settings-nav";

const emptyMarketing: MarketingIntegrationsForForm = {
  gtmContainerId: "",
  gtmEnabled: true,
  ga4MeasurementId: "",
  ga4Enabled: true,
  googleAdsConversionId: "",
  googleAdsConversionLabel: "",
  googleAdsEnabled: true,
  metaPixelId: "",
  metaPixelEnabled: true,
  tiktokPixelId: "",
  tiktokPixelEnabled: true,
  linkedinPartnerId: "",
  linkedinEnabled: true,
  googleSearchConsoleVerification: "",
  bingWebmasterVerification: "",
  metaDomainVerification: "",
  pinterestVerification: "",
};

describe("Phase 7 SEO health evaluator", () => {
  it("healthy tenant produces mostly passed and no critical for basic CMS", () => {
    const issues = evaluateSeoHealth({
      tenantSlug: "acme",
      tenantName: "ACME Motors",
      seo: {
        indexingEnabled: true,
        ogImagePath: "/brand/og.jpg",
        seoDescriptionDefault: "Default meta description for ACME storefront SEO.",
      },
      pages: [
        {
          pageId: "11111111-1111-4111-8111-111111111111",
          slug: "finantare",
          title: "Finanțare auto",
          h1: "Finanțare auto",
          intro: "Oferim opțiuni de finanțare clare pentru mașinile din stoc.",
          body: "Consultanții noștri te ajută să alegi rata potrivită, fără surprize.",
          status: "published",
          pageKind: "financing",
          seoTitle: "Finanțare",
          seoDescription: "Finanțare auto la ACME — rate clare, aprobare rapidă în showroom.",
          canonicalPath: null,
          noindex: false,
          includeInSitemap: true,
          faq: [{ question: "Ce avans e necesar?", answer: "Depinde de ofertă; discutăm în showroom." }],
          catalogFilters: {},
        },
      ],
      sitemapCmsPaths: ["/p/finantare"],
      vehicles: [
        {
          slug: "bmw-320",
          make: "BMW",
          model: "320",
          year: 2020,
          price: "25000",
          hasCoverImage: true,
        },
      ],
      marketing: emptyMarketing,
      live: {
        homepageHtml: "<html>Cookie-uri și confidențialitate</html>",
        robotsTxt: "User-agent: *\nAllow: /\n",
        sitemapXml: '<?xml version="1.0"?><urlset></urlset>',
        comparaHtml: '<meta name="robots" content="noindex, nofollow">',
        salvateHtml: '<meta name="robots" content="noindex, nofollow">',
      },
    });

    const summary = summarizeSeoHealth(issues);
    expect(summary.critical).toBe(0);
    expect(summary.passed).toBeGreaterThan(5);
    expect(summary.internalScore).toBeGreaterThan(50);
  });

  it("flags missing meta, noindex-in-sitemap, invalid canonical, empty inventory", () => {
    const issues = evaluateSeoHealth({
      tenantSlug: "acme",
      tenantName: "ACME",
      seo: { indexingEnabled: true },
      pages: [
        {
          pageId: "22222222-2222-4222-8222-222222222222",
          slug: "masini-audi",
          title: "Audi",
          h1: "Audi",
          intro: "Stoc Audi verificat pentru clienții din zonă, cu garanție dealer.",
          body: "Vezi oferta curentă și cere o programare în showroom pentru test drive.",
          status: "published",
          pageKind: "brand_inventory",
          seoTitle: null,
          seoDescription: null,
          canonicalPath: "https://evil.test/p/x",
          noindex: true,
          includeInSitemap: true,
          faq: [],
          catalogFilters: { make: ["Audi"] },
          inventoryVehicleCount: 0,
        },
      ],
      sitemapCmsPaths: ["/p/masini-audi"],
      vehicles: [],
      marketing: {
        ...emptyMarketing,
        bingWebmasterVerification: "bing-token-abc",
      },
      live: {
        homepageHtml: "<html><head></head><body>no cookies banner here</body></html>",
        sitemapXml: '<?xml version="1.0"?><urlset><url><loc>https://x/compara</loc></url></urlset>',
        comparaHtml: "<html>index me</html>",
        salvateHtml: '<meta name="robots" content="noindex">',
      },
    });

    const actionable = issues.filter((i) => i.severity === "critical" || i.severity === "warning");
    const ids = actionable.map((i) => i.id);
    expect(ids).toContain("cms_missing_meta");
    expect(ids).toContain("cms_invalid_canonical");
    expect(ids).toContain("cms_noindex_in_sitemap");
    expect(ids).toContain("cms_inventory_empty_published");
    expect(ids).toContain("sitemap_no_forbidden_paths");
    expect(ids).toContain("compara_noindex");
    expect(ids).toContain("verification_public_match");
    expect(ids).toContain("consent_banner_present");
  });

  it("detects consent/tracking regression when GTM appears pre-consent", () => {
    const issues = evaluateSeoHealth({
      tenantSlug: "acme",
      tenantName: "ACME",
      seo: { indexingEnabled: true },
      pages: [],
      sitemapCmsPaths: [],
      vehicles: [],
      marketing: {
        ...emptyMarketing,
        gtmContainerId: "GTM-TEST",
        gtmEnabled: true,
      },
      live: {
        homepageHtml:
          '<html><script src="https://www.googletagmanager.com/gtm.js?id=GTM-TEST"></script></html>',
      },
    });
    expect(issues.find((i) => i.id === "tracking_not_loaded_pre_consent")?.severity).toBe("warning");
    expect(issues.find((i) => i.id === "consent_banner_present")?.severity).toBe("warning");
  });

  it("does not warn when Pinterest verification is simply not configured", () => {
    const issues = evaluateSeoHealth({
      tenantSlug: "beta",
      tenantName: "Beta",
      seo: { indexingEnabled: true, ogImagePath: "/og.png" },
      pages: [],
      sitemapCmsPaths: [],
      vehicles: [],
      marketing: emptyMarketing,
    });
    const ver = issues.find((i) => i.id === "verification_public_match");
    expect(ver?.severity).toBe("info");
  });

  it("draft pages skipped for sitemap issues; intentional indexing off is info", () => {
    const issues = evaluateSeoHealth({
      tenantSlug: "acme",
      tenantName: "ACME",
      seo: { indexingEnabled: false },
      pages: [
        {
          pageId: "33333333-3333-4333-8333-333333333333",
          slug: "draft-page",
          title: "Draft",
          h1: "Draft",
          intro: "x".repeat(80),
          body: "y".repeat(80),
          status: "draft",
          pageKind: "custom",
          seoTitle: null,
          seoDescription: "Meta description for draft that should not be public yet.",
          canonicalPath: null,
          noindex: false,
          includeInSitemap: true,
          faq: [],
          catalogFilters: {},
        },
      ],
      sitemapCmsPaths: [],
      vehicles: [],
      marketing: emptyMarketing,
    });
    expect(issues.some((i) => i.id === "cms_indexable_missing_sitemap" && i.path === "/p/draft-page")).toBe(
      false,
    );
    expect(issues.find((i) => i.id === "homepage_indexing_flag")?.severity).toBe("info");
  });

  it("tenant A input cannot include tenant B paths — evaluator is input-scoped", () => {
    const a = evaluateSeoHealth({
      tenantSlug: "tenant-a",
      tenantName: "A",
      seo: { indexingEnabled: true },
      pages: [],
      sitemapCmsPaths: ["/p/only-a"],
      vehicles: [],
      marketing: emptyMarketing,
    });
    const b = evaluateSeoHealth({
      tenantSlug: "tenant-b",
      tenantName: "B",
      seo: { indexingEnabled: true },
      pages: [],
      sitemapCmsPaths: ["/p/only-b"],
      vehicles: [],
      marketing: emptyMarketing,
    });
    expect(a.every((i) => !i.path?.includes("only-b"))).toBe(true);
    expect(b.every((i) => !i.path?.includes("only-a"))).toBe(true);
  });

  it("sorts critical before passed", () => {
    const sorted = sortSeoHealthIssues([
      { id: "homepage_title", category: "homepage", severity: "passed", title: "p", detail: "d" },
      { id: "cms_missing_meta", category: "cms", severity: "critical", title: "c", detail: "d" },
    ]);
    expect(sorted[0]?.severity).toBe("critical");
  });
});

describe("Phase 7 SEO health access", () => {
  it("health route is owner-only under Marketing nav", () => {
    expect(SETTINGS_OWNER_ROLES).toEqual(["owner"]);
    expect(canAccessSettingsOwnerSection("owner")).toBe(true);
    expect(canAccessSettingsOwnerSection("manager")).toBe(false);
    const marketing = SETTINGS_NAV.find((i) => i.href === "/dashboard/settings/marketing");
    expect(marketing?.ownerOnly).toBe(true);
    expect(marketing?.children?.some((c) => c.href === "/dashboard/settings/marketing/health")).toBe(
      true,
    );
  });
});
