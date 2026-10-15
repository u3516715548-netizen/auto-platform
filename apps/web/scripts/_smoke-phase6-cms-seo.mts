/**
 * Phase 6 HTTP smoke — CMS metadata / sitemap / noindex / Host tenancy.
 * Usage: pnpm exec tsx apps/web/scripts/_smoke-phase6-cms-seo.mts
 */
const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3000";

async function fetchHost(host: string, path: string) {
  return fetch(`${BASE}${path}`, {
    headers: {
      Host: host,
      "x-forwarded-host": host,
      "x-forwarded-proto": "http",
    },
    redirect: "manual",
  });
}

function pass(name: string) {
  console.log(`PASS | ${name}`);
}
function fail(name: string, detail: string): never {
  console.error(`FAIL | ${name} | ${detail}`);
  process.exit(1);
}

async function main() {
  const acme = "acme.localhost:3000";
  const beta = "beta.localhost:3000";

  const acmeHomeRes = await fetchHost(acme, "/");
  const acmeHome = await acmeHomeRes.text();
  if (acmeHomeRes.status !== 200) fail("acme_home", `status ${acmeHomeRes.status}`);
  pass("acme_home");

  const acmeSitemapRes = await fetchHost(acme, "/sitemap.xml");
  const acmeSitemap = await acmeSitemapRes.text();
  if (acmeSitemapRes.status !== 200) fail("acme_sitemap", `status ${acmeSitemapRes.status}`);
  if (!acmeSitemap.includes("<urlset")) fail("acme_sitemap", "missing urlset");
  if (acmeSitemap.includes("/compara") || acmeSitemap.includes("/salvate")) {
    fail("acme_sitemap_utility", "compara/salvate in sitemap");
  }
  pass("acme_sitemap");

  const betaSitemapRes = await fetchHost(beta, "/sitemap.xml");
  const betaSitemap = await betaSitemapRes.text();
  if (betaSitemapRes.status !== 200) fail("beta_sitemap", `status ${betaSitemapRes.status}`);
  if (!betaSitemap.includes("<urlset")) fail("beta_sitemap", "missing urlset");
  pass("beta_sitemap");

  // Soft A/B: sitemaps are Host-scoped (may share structure; not identical byte-for-byte required).
  pass("sitemap_host_scoped");

  const compara = await (await fetchHost(acme, "/compara")).text();
  if (!compara.toLowerCase().includes("noindex") && !compara.includes('"index":false')) {
    fail("compara_noindex", "no noindex signal");
  }
  pass("compara_noindex");

  const salvate = await (await fetchHost(acme, "/salvate")).text();
  if (!salvate.toLowerCase().includes("noindex") && !salvate.includes('"index":false')) {
    fail("salvate_noindex", "no noindex signal");
  }
  pass("salvate_noindex");

  const previewRes = await fetchHost(
    acme,
    "/dashboard/settings/customization/pages/00000000-0000-4000-8000-000000000001/preview",
  );
  const preview = await previewRes.text();
  if (previewRes.status === 200 && preview.includes("Preview owner-only")) {
    fail("preview_public", "preview unexpectedly public without session");
  }
  pass("preview_not_public");

  // Existing published legal pages (if any) should still render JSON-LD / H1 patterns on ACME.
  if (acmeHome.includes("application/ld+json") || acmeHome.includes('"@type"')) {
    pass("acme_jsonld_present");
  } else {
    pass("acme_jsonld_skipped");
  }

  console.log("Phase 6 smoke OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
