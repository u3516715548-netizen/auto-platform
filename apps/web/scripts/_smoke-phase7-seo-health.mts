/**
 * Phase 7 HTTP smoke — live surfaces the SEO health engine probes.
 * Standalone (no app imports) so `next build` typecheck stays clean.
 * Usage (from apps/web): pnpm exec tsx scripts/_smoke-phase7-seo-health.mts
 */
const BASE = process.env.SMOKE_BASE ?? process.env.SEO_HEALTH_FETCH_BASE ?? "http://127.0.0.1:3000";

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

function pass(name: string, detail = "") {
  console.log(`PASS | ${name}${detail ? ` | ${detail}` : ""}`);
}
function fail(name: string, detail: string): never {
  console.error(`FAIL | ${name} | ${detail}`);
  process.exit(1);
}

async function probeTenant(slug: string) {
  const host = `${slug}.localhost:3000`;

  const homeRes = await fetchHost(host, "/");
  const home = await homeRes.text();
  if (homeRes.status !== 200) fail(`${slug}_home`, `status ${homeRes.status}`);
  if (!home.includes("Cookie-uri")) fail(`${slug}_consent`, "Cookie-uri missing");
  if (home.includes("googletagmanager.com/gtm.js")) {
    fail(`${slug}_gtm_pre_consent`, "gtm.js without consent cookie");
  }
  pass(`${slug}_home_consent`);

  const robotsRes = await fetchHost(host, "/robots.txt");
  const robots = await robotsRes.text();
  if (robotsRes.status !== 200 || !robots.trim()) fail(`${slug}_robots`, `status ${robotsRes.status}`);
  pass(`${slug}_robots`);

  const smRes = await fetchHost(host, "/sitemap.xml");
  const sm = await smRes.text();
  if (smRes.status !== 200 || !sm.includes("<urlset")) fail(`${slug}_sitemap`, "missing urlset");
  const locs = [...sm.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => (m[1] ?? "").trim());
  for (const loc of locs) {
    let path = loc;
    try {
      path = new URL(loc).pathname;
    } catch {
      /* relative */
    }
    if (path === "/compara" || path.startsWith("/compara/") || path === "/salvate" || path.startsWith("/salvate/") || path.startsWith("/dashboard")) {
      fail(`${slug}_sitemap_forbidden`, loc);
    }
  }
  pass(`${slug}_sitemap_clean`, `${locs.length} locs`);

  for (const path of ["/compara", "/salvate"] as const) {
    const res = await fetchHost(host, path);
    const html = (await res.text()).toLowerCase();
    if (res.status >= 500) fail(`${slug}_${path.slice(1)}`, `status ${res.status}`);
    if (!html.includes("noindex")) fail(`${slug}_${path.slice(1)}_noindex`, "missing noindex");
    pass(`${slug}_${path.slice(1)}_noindex`);
  }

  return { host, homeLen: home.length, sitemap: sm };
}

async function main() {
  const acme = await probeTenant("acme");
  const beta = await probeTenant("beta");

  if (acme.sitemap === beta.sitemap) {
    console.warn("WARN | acme_beta_sitemap_identical");
  } else {
    pass("acme_beta_sitemap_differ");
  }
  if (acme.homeLen === beta.homeLen) {
    console.warn("WARN | acme_beta_homepage_same_length");
  } else {
    pass("acme_beta_homepage_differ", `acme=${acme.homeLen} beta=${beta.homeLen}`);
  }

  console.log("Phase 7 smoke OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
