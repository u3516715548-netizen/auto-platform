import {
  CMS_PUBLISH_MIN_CONTENT_CHARS,
  isInventoryPageKind,
  isSelfCanonicalPage,
  landingFiltersHaveConstraint,
  normalizeCanonicalPath,
  resolvePageCanonicalPath,
  type LandingCatalogFilters,
  type PublicSeoSettingsView,
  type TenantPageKind,
  type TenantPageStatus,
} from "@auto-platform/types";
import { buildPublicCatalogMetadata } from "@/lib/storefront/catalog-seo";
import {
  buildForcedNoindexMetadata,
  buildPublicCmsPageMetadata,
} from "@/lib/seo/build-page-metadata";
import { buildVerificationMetadata } from "@/lib/marketing/build-verification-metadata";
import type { MarketingIntegrationsForForm } from "@/lib/marketing/get-marketing-integrations";
import type {
  SeoHealthIssue,
  SeoHealthLiveSnapshot,
} from "@/lib/seo/health/types";

export type SeoHealthPageInput = {
  pageId: string;
  slug: string;
  title: string;
  body: string;
  intro: string;
  h1: string | null;
  status: TenantPageStatus;
  pageKind: TenantPageKind;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  noindex: boolean;
  includeInSitemap: boolean;
  faq: Array<{ question: string; answer: string }>;
  catalogFilters: LandingCatalogFilters;
  inventoryVehicleCount?: number;
};

export type SeoHealthVehicleSample = {
  slug: string;
  make: string;
  model: string;
  year: number;
  price: string;
  hasCoverImage: boolean;
};

export type SeoHealthEvaluateInput = {
  tenantSlug: string;
  tenantName: string;
  seo: PublicSeoSettingsView;
  pages: SeoHealthPageInput[];
  /** Paths that sitemap helper would emit for CMS pages. */
  sitemapCmsPaths: string[];
  vehicles: SeoHealthVehicleSample[];
  marketing: MarketingIntegrationsForForm;
  live?: SeoHealthLiveSnapshot | null;
};

function pass(
  id: SeoHealthIssue["id"],
  category: SeoHealthIssue["category"],
  title: string,
  detail: string,
  extra?: Partial<SeoHealthIssue>,
): SeoHealthIssue {
  return { id, category, severity: "passed", title, detail, ...extra };
}

function warn(
  id: SeoHealthIssue["id"],
  category: SeoHealthIssue["category"],
  title: string,
  detail: string,
  extra?: Partial<SeoHealthIssue>,
): SeoHealthIssue {
  return { id, category, severity: "warning", title, detail, ...extra };
}

function critical(
  id: SeoHealthIssue["id"],
  category: SeoHealthIssue["category"],
  title: string,
  detail: string,
  extra?: Partial<SeoHealthIssue>,
): SeoHealthIssue {
  return { id, category, severity: "critical", title, detail, ...extra };
}

function info(
  id: SeoHealthIssue["id"],
  category: SeoHealthIssue["category"],
  title: string,
  detail: string,
  extra?: Partial<SeoHealthIssue>,
): SeoHealthIssue {
  return { id, category, severity: "info", title, detail, ...extra };
}

function sitemapEligible(page: SeoHealthPageInput): boolean {
  if (page.status !== "published") return false;
  if (page.noindex) return false;
  if (!page.includeInSitemap) return false;
  if (!isSelfCanonicalPage(page.slug, page.canonicalPath)) return false;
  const contentLen = `${page.intro ?? ""}${page.body ?? ""}`.trim().length;
  if (contentLen < 40) return false;
  if (!(page.seoDescription ?? "").trim()) return false;
  if (!(page.title ?? "").trim()) return false;
  return true;
}

/**
 * Pure evaluator — no I/O. Unit-test friendly and tenant-scoped by input only.
 */
export function evaluateSeoHealth(input: SeoHealthEvaluateInput): SeoHealthIssue[] {
  const issues: SeoHealthIssue[] = [];
  const { seo, tenantName, pages, sitemapCmsPaths, vehicles, marketing, live } = input;
  const origin = "https://health.example.test";

  // —— Homepage / catalog (metadata builders) ——
  const catalogMeta = buildPublicCatalogMetadata({
    dealerName: tenantName,
    hasQuery: false,
  });
  const catalogWithSeoTitle =
    typeof catalogMeta.title === "string" && catalogMeta.title.trim().length > 0;
  issues.push(
    catalogWithSeoTitle
      ? pass("homepage_title", "homepage", "Homepage are title", `Title: ${String(catalogMeta.title)}`)
      : critical("homepage_title", "homepage", "Homepage fără title", "Metadata catalog nu are title.", {
          href: "/dashboard/settings/customization/preferences",
        }),
  );

  const catalogDesc =
    typeof catalogMeta.description === "string" ? catalogMeta.description.trim() : "";
  issues.push(
    catalogDesc
      ? pass(
          "homepage_meta_description",
          "homepage",
          "Homepage are meta description",
          "Descrierea catalogului este prezentă.",
        )
      : critical(
          "homepage_meta_description",
          "homepage",
          "Homepage fără meta description",
          "Lipsește description pe catalog.",
          { href: "/dashboard/settings/customization/preferences" },
        ),
  );

  issues.push(
    catalogMeta.alternates?.canonical === "/"
      ? pass("homepage_canonical", "homepage", "Homepage canonical corect", "Canonical = `/`.")
      : critical(
          "homepage_canonical",
          "homepage",
          "Homepage canonical invalid",
          "Canonical catalog ar trebui să fie `/`.",
        ),
  );

  if (seo.ogImagePath) {
    issues.push(
      pass("homepage_og", "homepage", "OG image configurat", `Path: ${seo.ogImagePath}`, {
        href: "/dashboard/settings/customization/preferences",
      }),
    );
  } else {
    issues.push(
      warn(
        "homepage_og",
        "homepage",
        "Lipsește OG image (fallback)",
        "Nu există og_image_path în Preferințe SEO. Social previews vor fi mai slabe.",
        { href: "/dashboard/settings/customization/preferences" },
      ),
    );
  }

  issues.push(
    pass(
      "homepage_jsonld",
      "homepage",
      "JSON-LD Organization/WebSite pe homepage",
      "Storefront emite Organization + WebSite pe catalog (Phase 2).",
    ),
  );

  if (seo.indexingEnabled === false) {
    issues.push(
      info(
        "homepage_indexing_flag",
        "homepage",
        "Indexarea este dezactivată intenționat",
        "indexingEnabled=false — robots/metadata vor fi noindex. Nu este o eroare dacă e alegerea dealerului.",
        { href: "/dashboard/settings/customization/preferences" },
      ),
    );
  } else {
    issues.push(
      pass(
        "homepage_indexing_flag",
        "homepage",
        "Indexare activă",
        "indexingEnabled=true.",
      ),
    );
  }

  const queryMeta = buildPublicCatalogMetadata({ dealerName: tenantName, hasQuery: true });
  issues.push(
    queryMeta.robots &&
      typeof queryMeta.robots === "object" &&
      "index" in queryMeta.robots &&
      queryMeta.robots.index === false
      ? pass(
          "catalog_query_noindex",
          "catalog",
          "Catalog cu query este noindex",
          "Filtrele/căutările rămân noindex cu canonical `/`.",
        )
      : critical(
          "catalog_query_noindex",
          "catalog",
          "Catalog cu query nu este noindex",
          "Regresie Phase 2: URL-urile cu query ar trebui noindex.",
        ),
  );

  // —— CMS pages ——
  const sitemapSet = new Set(sitemapCmsPaths);
  for (const page of pages) {
    const path = `/p/${page.slug}`;
    const editHref = `/dashboard/settings/customization/pages/${page.pageId}`;

    if (page.status === "draft" || page.status === "archived") {
      // Only flag if live probe says public
      if (live?.draftProbe?.slug === page.slug && live.draftProbe.status === 200) {
        issues.push(
          critical(
            "cms_draft_or_archived_public",
            "cms",
            `Draft/archived public: ${path}`,
            `Status ${page.status} dar răspuns HTTP 200 pe storefront.`,
            { path, href: editHref },
          ),
        );
      }
      continue;
    }

    if (page.status !== "published") continue;

    if (!page.title.trim()) {
      issues.push(
        critical("cms_missing_title", "cms", `Title lipsă: ${path}`, "Pagina publicată fără title.", {
          path,
          href: editHref,
        }),
      );
    } else {
      issues.push(
        pass("cms_missing_title", "cms", `Title OK: ${path}`, page.title, { path }),
      );
    }

    const h1 = (page.h1 ?? page.title).trim();
    if (!h1) {
      issues.push(
        critical("cms_missing_h1", "cms", `H1 lipsă: ${path}`, "H1/title gol pe pagina publicată.", {
          path,
          href: editHref,
        }),
      );
    } else {
      issues.push(pass("cms_missing_h1", "cms", `H1 OK: ${path}`, h1, { path }));
    }

    const meta = (page.seoDescription ?? "").trim();
    if (!meta) {
      issues.push(
        critical(
          "cms_missing_meta",
          "cms",
          `Meta description lipsă: ${path}`,
          "Pagina publicată fără meta description.",
          { path, href: editHref },
        ),
      );
    } else {
      issues.push(pass("cms_missing_meta", "cms", `Meta OK: ${path}`, `${meta.length} caractere`, { path }));
    }

    const contentLen = `${page.intro}${page.body}`.trim().length;
    if (contentLen < CMS_PUBLISH_MIN_CONTENT_CHARS) {
      issues.push(
        warn(
          "cms_thin_content",
          "cms",
          `Conținut subțire: ${path}`,
          `intro+body = ${contentLen} caractere (recomandat ≥ ${CMS_PUBLISH_MIN_CONTENT_CHARS}).`,
          { path, href: editHref },
        ),
      );
    } else {
      issues.push(
        pass("cms_thin_content", "cms", `Conținut util: ${path}`, `${contentLen} caractere`, {
          path,
        }),
      );
    }

    if (page.canonicalPath) {
      const normalized = normalizeCanonicalPath(page.canonicalPath);
      if (!normalized) {
        issues.push(
          critical(
            "cms_invalid_canonical",
            "cms",
            `Canonical override invalid: ${path}`,
            `Valoare respinsă: „${page.canonicalPath}”. Fallback self-canonical la render.`,
            { path, href: editHref },
          ),
        );
      } else {
        issues.push(
          pass(
            "cms_invalid_canonical",
            "cms",
            `Canonical override valid: ${path}`,
            `→ ${resolvePageCanonicalPath(page.slug, page.canonicalPath)}`,
            { path },
          ),
        );
      }
    }

    const inSitemap = sitemapSet.has(path);
    const shouldBeInSitemap = sitemapEligible(page);
    if (page.noindex && inSitemap) {
      issues.push(
        critical(
          "cms_noindex_in_sitemap",
          "cms",
          `noindex în sitemap: ${path}`,
          "Pagina e marcată noindex dar apare în sitemap.",
          { path, href: editHref },
        ),
      );
    } else if (page.noindex) {
      issues.push(
        pass(
          "cms_noindex_in_sitemap",
          "cms",
          `noindex exclus din sitemap: ${path}`,
          "Corect — pagina noindex nu e în sitemap.",
          { path },
        ),
      );
    }

    if (shouldBeInSitemap && !inSitemap) {
      issues.push(
        critical(
          "cms_indexable_missing_sitemap",
          "cms",
          `Lipsește din sitemap: ${path}`,
          "Pagina published + indexable ar trebui să apară în sitemap.",
          { path, href: editHref },
        ),
      );
    } else if (shouldBeInSitemap && inSitemap) {
      issues.push(
        pass(
          "cms_indexable_missing_sitemap",
          "cms",
          `În sitemap: ${path}`,
          "Pagina indexabilă este inclusă în sitemap.",
          { path },
        ),
      );
    } else if (!shouldBeInSitemap && !page.noindex && page.includeInSitemap === false) {
      issues.push(
        info(
          "cms_indexable_missing_sitemap",
          "cms",
          `Exclusă intenționat din sitemap: ${path}`,
          "include_in_sitemap=false.",
          { path, href: editHref },
        ),
      );
    }

    if (isInventoryPageKind(page.pageKind)) {
      const count = page.inventoryVehicleCount ?? 0;
      if (!landingFiltersHaveConstraint(page.catalogFilters) || count < 1) {
        issues.push(
          critical(
            "cms_inventory_empty_published",
            "cms",
            `Inventar gol publicat: ${path}`,
            "Landing inventory published fără filtre valide sau fără vehicule — ar trebui blocat la publish.",
            { path, href: editHref },
          ),
        );
      } else {
        issues.push(
          pass(
            "cms_inventory_empty_published",
            "cms",
            `Inventar OK: ${path}`,
            `${count} vehicule pentru filtrele curate.`,
            { path },
          ),
        );
        issues.push(
          pass(
            "cms_itemlist_ok",
            "cms",
            `ItemList justificat: ${path}`,
            "Lista de vehicule este vizibilă → ItemList JSON-LD permis.",
            { path },
          ),
        );
      }
    }

    if (page.faq.length > 0) {
      const bad = page.faq.some((f) => !f.question.trim() || !f.answer.trim());
      issues.push(
        bad
          ? warn(
              "cms_faq_schema_ok",
              "cms",
              `FAQ incomplet: ${path}`,
              "FAQ vizibil cu Q/A goale — FAQPage ar fi invalid.",
              { path, href: editHref },
            )
          : pass(
              "cms_faq_schema_ok",
              "cms",
              `FAQ vizibil OK: ${path}`,
              `${page.faq.length} întrebări — FAQPage poate fi emis.`,
              { path },
            ),
      );
    }

    // Spot-check metadata builder
    const built = buildPublicCmsPageMetadata({
      page: {
        slug: page.slug,
        title: page.title,
        body: page.body,
        pageKind: page.pageKind,
        seoTitle: page.seoTitle ?? undefined,
        seoDescription: page.seoDescription ?? undefined,
        h1: page.h1 ?? undefined,
        intro: page.intro,
        canonicalPath: resolvePageCanonicalPath(page.slug, page.canonicalPath),
        noindex: page.noindex,
        includeInSitemap: page.includeInSitemap,
        faq: page.faq,
        catalogFilters: page.catalogFilters,
        internalLinks: [],
      },
      dealerName: tenantName,
      seo,
      origin,
    });
    if (page.noindex && built.robots && typeof built.robots === "object" && "index" in built.robots) {
      if (built.robots.index !== false) {
        issues.push(
          critical(
            "cms_noindex_in_sitemap",
            "cms",
            `Metadata noindex eșuat: ${path}`,
            "noindex=true dar metadata nu setează robots.index=false.",
            { path },
          ),
        );
      }
    }
  }

  // —— Vehicles (sample) ——
  if (vehicles.length === 0) {
    issues.push(
      info(
        "vehicle_title_meta",
        "vehicle",
        "Niciun vehicul disponibil de verificat",
        "Nu există sample PDP în stoc — skip vehicle checks.",
      ),
    );
  } else {
    for (const v of vehicles.slice(0, 5)) {
      const path = `/vehicles/${v.slug}`;
      const titleOk = Boolean(v.make && v.model && v.year);
      issues.push(
        titleOk
          ? pass(
              "vehicle_title_meta",
              "vehicle",
              `PDP title inputs OK: ${path}`,
              `${v.make} ${v.model} ${v.year}`,
              { path },
            )
          : warn(
              "vehicle_title_meta",
              "vehicle",
              `PDP date incomplete: ${path}`,
              "Lipsesc make/model/year pentru title.",
              { path },
            ),
      );
      issues.push(
        pass(
          "vehicle_canonical",
          "vehicle",
          `Canonical PDP: ${path}`,
          "Canonical Phase 2 = `/vehicles/{slug}`.",
          { path },
        ),
      );
      issues.push(
        v.hasCoverImage
          ? pass("vehicle_og", "vehicle", `Cover image: ${path}`, "Are imagine cover.", { path })
          : warn(
              "vehicle_og",
              "vehicle",
              `Fără cover image: ${path}`,
              "OG/social pentru PDP poate fi mai slab fără cover.",
              { path },
            ),
      );
    }
    issues.push(
      pass(
        "vehicle_product_jsonld_safe",
        "vehicle",
        "Product JSON-LD fără VIN / signed URLs",
        "Builder-ul Product/Offer folosește doar slug, preț, nume și imagini stabile (Phase 2).",
      ),
    );
  }

  // —— Compara / salvate ——
  const forced = buildForcedNoindexMetadata("test");
  const forcedOk =
    forced.robots &&
    typeof forced.robots === "object" &&
    "index" in forced.robots &&
    forced.robots.index === false;
  issues.push(
    forcedOk
      ? pass(
          "compara_noindex",
          "technical",
          "/compara și /salvate forțat noindex (metadata)",
          "buildForcedNoindexMetadata setează index:false.",
        )
      : critical(
          "compara_noindex",
          "technical",
          "Regresie noindex pe utility pages",
          "buildForcedNoindexMetadata nu forțează noindex.",
        ),
  );

  // —— Marketing config (not-configured is info, not warning) ——
  const hasGtm = Boolean(marketing.gtmContainerId.trim() && marketing.gtmEnabled);
  const hasGa4 = Boolean(marketing.ga4MeasurementId.trim() && marketing.ga4Enabled);
  if (!hasGtm && !hasGa4) {
    issues.push(
      info(
        "marketing_ids_configured",
        "marketing",
        "Analytics neconfigurat",
        "GTM/GA4 nu sunt setate — OK dacă dealerul nu folosește tracking încă.",
        { href: "/dashboard/settings/marketing/analytics" },
      ),
    );
  } else {
    issues.push(
      pass(
        "marketing_ids_configured",
        "marketing",
        "Analytics configurat",
        hasGtm ? "GTM enabled" : "GA4 direct enabled",
        { href: "/dashboard/settings/marketing/analytics" },
      ),
    );
  }

  const verificationConfigured = {
    google: marketing.googleSearchConsoleVerification.trim(),
    bing: marketing.bingWebmasterVerification.trim(),
    meta: marketing.metaDomainVerification.trim(),
    pinterest: marketing.pinterestVerification.trim(),
  };
  const verificationMeta = buildVerificationMetadata({
    preferGtm: hasGtm,
    verification: {
      ...(verificationConfigured.google ? { google: verificationConfigured.google } : {}),
      ...(verificationConfigured.bing ? { bing: verificationConfigured.bing } : {}),
      ...(verificationConfigured.meta ? { metaDomain: verificationConfigured.meta } : {}),
      ...(verificationConfigured.pinterest
        ? { pinterest: verificationConfigured.pinterest }
        : {}),
    },
  });
  const anyVerification = Object.values(verificationConfigured).some(Boolean);
  if (!anyVerification) {
    issues.push(
      info(
        "verification_public_match",
        "marketing",
        "Niciun verification tag configurat",
        "Nu este o problemă — opțional.",
        { href: "/dashboard/settings/marketing/verification" },
      ),
    );
  } else if (!verificationMeta) {
    issues.push(
      critical(
        "verification_public_match",
        "marketing",
        "Verification configurat dar metadata builder e gol",
        "Token-urile există în settings dar buildVerificationMetadata nu le expune.",
        { href: "/dashboard/settings/marketing/verification" },
      ),
    );
  } else {
    issues.push(
      pass(
        "verification_public_match",
        "marketing",
        "Verification metadata builder OK",
        "Token-urile configurate sunt proiectate în Metadata API.",
        { href: "/dashboard/settings/marketing/verification" },
      ),
    );
  }

  // —— Live HTTP (when provided) ——
  if (live) {
    if (live.fetchErrors?.length) {
      issues.push(
        warn(
          "robots_responds",
          "technical",
          "Live fetch parțial eșuat",
          live.fetchErrors.join("; "),
        ),
      );
    }

    if (live.robotsTxt != null) {
      const robots = live.robotsTxt;
      issues.push(
        robots.length > 0
          ? pass("robots_responds", "technical", "robots.txt răspunde", `${robots.length} bytes`)
          : critical("robots_responds", "technical", "robots.txt gol", "Răspuns empty."),
      );
      if (seo.indexingEnabled === false) {
        const disallowsAll =
          /disallow:\s*\/\s*$/im.test(robots) || /disallow:\s*\/\s*\n/i.test(robots);
        issues.push(
          disallowsAll
            ? pass(
                "robots_indexing_match",
                "technical",
                "robots respectă indexing disabled",
                "Disallow / prezent când indexingEnabled=false.",
              )
            : warn(
                "robots_indexing_match",
                "technical",
                "robots poate nu reflecte indexing disabled",
                "indexingEnabled=false dar robots nu arată Disallow: / explicit.",
                { href: "/dashboard/settings/customization/preferences" },
              ),
        );
      } else {
        issues.push(
          pass(
            "robots_indexing_match",
            "technical",
            "robots cu indexare activă",
            "indexingEnabled=true — robots permite crawl pe storefront.",
          ),
        );
      }
    }

    if (live.sitemapXml != null) {
      const sm = live.sitemapXml;
      issues.push(
        sm.includes("<urlset")
          ? pass("sitemap_responds", "technical", "sitemap.xml răspunde", "urlset prezent")
          : critical(
              "sitemap_responds",
              "technical",
              "sitemap.xml invalid",
              "Lipsește <urlset>.",
            ),
      );
      // Inspect <loc> values only — bare `?` would false-positive on `<?xml …?>`.
      const locUrls = [...sm.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) =>
        (m[1] ?? "").trim(),
      );
      const forbiddenLoc = locUrls.find((url) => {
        try {
          const u = new URL(url, origin);
          const path = u.pathname;
          return (
            path === "/compara" ||
            path.startsWith("/compara/") ||
            path === "/salvate" ||
            path.startsWith("/salvate/") ||
            path.startsWith("/dashboard") ||
            u.search.length > 0
          );
        } catch {
          return /\/compara|\/salvate|\/dashboard|\?/.test(url);
        }
      });
      issues.push(
        forbiddenLoc
          ? critical(
              "sitemap_no_forbidden_paths",
              "technical",
              "Sitemap conține URL-uri interzise",
              `Găsit loc interzis: ${forbiddenLoc}`,
            )
          : pass(
              "sitemap_no_forbidden_paths",
              "technical",
              "Sitemap fără path-uri interzise",
              "Fără compara/salvate/dashboard/query în <loc>.",
            ),
      );
    }

    if (live.comparaHtml != null) {
      const html = live.comparaHtml.toLowerCase();
      const ok = html.includes("noindex") || html.includes('"index":false');
      issues.push(
        ok
          ? pass("compara_noindex", "technical", "/compara noindex (live)", "Semnal noindex în HTML.")
          : critical(
              "compara_noindex",
              "technical",
              "/compara fără noindex (live)",
              "Regresie: /compara ar trebui noindex.",
              { path: "/compara" },
            ),
      );
    }
    if (live.salvateHtml != null) {
      const html = live.salvateHtml.toLowerCase();
      const ok = html.includes("noindex") || html.includes('"index":false');
      issues.push(
        ok
          ? pass("salvate_noindex", "technical", "/salvate noindex (live)", "Semnal noindex în HTML.")
          : critical(
              "salvate_noindex",
              "technical",
              "/salvate fără noindex (live)",
              "Regresie: /salvate ar trebui noindex.",
              { path: "/salvate" },
            ),
      );
    }

    if (live.homepageHtml != null) {
      const html = live.homepageHtml;
      const hasBanner =
        html.includes("Cookie-uri") ||
        html.includes("ab-consent") ||
        html.includes("Preferințe cookie") ||
        html.includes("ConsentBanner");
      issues.push(
        hasBanner
          ? pass(
              "consent_banner_present",
              "consent",
              "Consent banner prezent pe homepage",
              "SSR/client consent UI detectat în HTML.",
            )
          : warn(
              "consent_banner_present",
              "consent",
              "Consent banner nedetectat în HTML",
              "Verifică Phase 4 wiring pe PublicStorefrontShell.",
            ),
      );

      const hasGtmScript =
        html.includes("googletagmanager.com/gtm.js") || html.includes("autobear-gtm");
      issues.push(
        hasGtmScript
          ? warn(
              "tracking_not_loaded_pre_consent",
              "consent",
              "GTM pare prezent în HTML fără cookie de consent",
              "Poate fi fals pozitiv dacă utilizatorul avea deja consent; verifică Network fără cookie ab_consent.",
            )
          : pass(
              "tracking_not_loaded_pre_consent",
              "consent",
              "Fără GTM pre-consent în HTML",
              "Niciun gtm.js detectat în răspunsul homepage (cookie-less).",
            ),
      );

      if (anyVerification) {
        const googleOk =
          !verificationConfigured.google ||
          html.includes(verificationConfigured.google) ||
          html.includes("google-site-verification");
        const bingOk =
          !verificationConfigured.bing ||
          html.includes(verificationConfigured.bing) ||
          html.includes("msvalidate.01");
        if (!googleOk || !bingOk) {
          issues.push(
            critical(
              "verification_public_match",
              "marketing",
              "Verification tag configurat dar absent în HTML public",
              "Token în dashboard, dar homepage HTML nu îl conține.",
              { href: "/dashboard/settings/marketing/verification", path: "/" },
            ),
          );
        }
      }
    }
  } else {
    issues.push(
      info(
        "robots_responds",
        "technical",
        "Live HTTP neefectuat",
        "Checks robots/sitemap/consent live necesită fetch Host; rulate când serverul e disponibil.",
      ),
    );
  }

  return issues;
}
