import { describe, expect, it } from "vitest";
import {
  createTenantPageInputSchema,
  normalizeTenantPageSlug,
  sanitizeTenantPageBody,
  upsertTenantSeoSettingsInputSchema,
} from "@auto-platform/types";
import { renderTenantPageBodyHtml } from "@/lib/cms/page-body";
import {
  applySeoDefaultsToCatalogMetadata,
  buildPublicCmsPageMetadata,
} from "@/lib/seo/build-page-metadata";
import { buildPublicCatalogMetadata } from "@/lib/storefront/catalog-seo";

describe("Etapa 23A CMS slug + sanitize", () => {
  it("accepts legal and custom slugs; rejects invalid", () => {
    expect(normalizeTenantPageSlug("Despre")).toBe("despre");
    expect(normalizeTenantPageSlug("despre-noi")).toBe("despre-noi");
    expect(normalizeTenantPageSlug("a")).toBeNull();
    expect(normalizeTenantPageSlug("../x")).toBeNull();
    expect(normalizeTenantPageSlug("hello world")).toBe("hello-world");
  });

  it("strips HTML/script and rejects javascript:", () => {
    expect(sanitizeTenantPageBody("Salut <b>lume</b>")).toBe("Salut lume");
    expect(sanitizeTenantPageBody('<script>alert(1)</script>')).toBeNull();
    expect(sanitizeTenantPageBody("click javascript:alert(1)")).toBeNull();
    expect(sanitizeTenantPageBody('<iframe src="x"></iframe>')).toBeNull();
  });

  it("create schema maps legal slug to kind and blocks collisions of kind/slug", () => {
    const ok = createTenantPageInputSchema.safeParse({
      title: "Despre noi",
      slug: "despre",
      body: "Text simplu",
      pageKind: "custom",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.pageKind).toBe("about");
      expect(ok.data.slug).toBe("despre");
    }

    const bad = createTenantPageInputSchema.safeParse({
      title: "X",
      slug: "about-wrong",
      body: "ok",
      pageKind: "about",
    });
    expect(bad.success).toBe(false);
  });

  it("render escapes HTML so injected tags cannot execute", () => {
    const html = renderTenantPageBodyHtml('A <img src=x onerror=alert(1)> B\nC');
    expect(html).toContain("&lt;img");
    expect(html).toContain("<br />");
    expect(html).not.toContain("<img");
  });
});

describe("Etapa 23A SEO metadata", () => {
  it("CMS metadata uses page SEO, canonical slug, respects indexing flag", () => {
    const meta = buildPublicCmsPageMetadata({
      page: {
        slug: "termeni",
        title: "Termeni",
        body: "…",
        pageKind: "terms",
        seoTitle: "Termeni SEO",
        seoDescription: "Desc SEO",
      },
      dealerName: "ACME",
      seo: { indexingEnabled: true },
    });
    expect(meta.title).toBe("Termeni SEO");
    expect(meta.description).toBe("Desc SEO");
    expect(meta.alternates).toEqual({ canonical: "/p/termeni" });
    expect(meta.robots).toEqual({ index: true, follow: true });

    const noindex = buildPublicCmsPageMetadata({
      page: {
        slug: "termeni",
        title: "Termeni",
        body: "",
        pageKind: "terms",
      },
      dealerName: "ACME",
      seo: { indexingEnabled: false },
    });
    expect(noindex.robots).toEqual({ index: false, follow: true });
  });

  it("catalog keeps query canonical / and can apply SEO defaults", () => {
    const withQuery = buildPublicCatalogMetadata({
      dealerName: "ACME",
      hasQuery: true,
    });
    expect(withQuery.alternates).toEqual({ canonical: "/" });
    expect(withQuery.robots).toEqual({ index: false, follow: true });

    const applied = applySeoDefaultsToCatalogMetadata(
      buildPublicCatalogMetadata({ dealerName: "ACME", hasQuery: false }),
      {
        seoTitleDefault: "ACME Title",
        seoDescriptionDefault: "ACME Desc",
        indexingEnabled: true,
      },
      "ACME",
    );
    expect(applied.title).toBe("ACME Title");
    expect(applied.description).toBe("ACME Desc");
  });

  it("SEO settings schema validates favicon and lengths", () => {
    expect(
      upsertTenantSeoSettingsInputSchema.safeParse({
        seoTitleDefault: "OK",
        seoDescriptionDefault: "Desc",
        faviconPath: "tenants/acme/favicon.ico",
        indexingEnabled: true,
      }).success,
    ).toBe(true);

    expect(
      upsertTenantSeoSettingsInputSchema.safeParse({
        seoTitleDefault: "OK",
        faviconPath: "../secret",
        indexingEnabled: true,
      }).success,
    ).toBe(false);
  });
});
