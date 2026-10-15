/**
 * HTTP smoke for Phase 2 SEO against local Next (Host-based tenancy).
 */
const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3000";

type Check = { name: string; ok: boolean; detail: string };

async function fetchHost(host: string, path: string): Promise<Response> {
  const url = `${BASE}${path}`;
  return fetch(url, {
    headers: {
      Host: host,
      "x-forwarded-host": host,
      "x-forwarded-proto": "http",
    },
    redirect: "manual",
  });
}

function extractMeta(html: string) {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "";
  const robots =
    html.match(
      /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    )?.[1] ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["'][^>]*>/i,
    )?.[1] ??
    "";
  const ogTitle =
    html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ?? "";
  const ogImage =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ?? "";
  const ogUrl =
    html.match(
      /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ?? "";
  const twitterCard =
    html.match(
      /<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ?? "";
  const twitterSite =
    html.match(
      /<meta[^>]+name=["']twitter:site["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ?? "";
  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    "";
  const jsonLdBlocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((m) => m[1] ?? "");
  return {
    title,
    robots,
    ogTitle,
    ogImage,
    ogUrl,
    twitterCard,
    twitterSite,
    canonical,
    jsonLdBlocks,
    jsonLdJoined: jsonLdBlocks.join("\n"),
  };
}

function printSection(title: string, body: string) {
  console.log(`\n=== ${title} ===`);
  console.log(body);
}

async function main() {
  const only = process.argv[2]; // optional: indexing-off
  const checks: Check[] = [];
  const acmeHost = "acme.localhost:3000";
  const betaHost = "beta.localhost:3000";

  if (only === "indexing-off") {
    const robots = await (await fetchHost(acmeHost, "/robots.txt")).text();
    const sm = await (await fetchHost(acmeHost, "/sitemap.xml")).text();
    const homeHtml = await (await fetchHost(acmeHost, "/")).text();
    const homeMeta = extractMeta(homeHtml);
    printSection("indexing-off robots.txt", robots);
    printSection("indexing-off sitemap", sm.slice(0, 400) || "(empty body)");
    printSection("indexing-off homepage robots meta", homeMeta.robots || "(none)");
    const disallowAll = /Disallow:\s*\/\s*$/m.test(robots) || robots.includes("Disallow: /\n");
    checks.push({
      name: "indexing-off robots disallow /",
      ok: robots.includes("Disallow: /") && !robots.includes("Sitemap:"),
      detail: disallowAll ? "disallow-root" : robots.slice(0, 120),
    });
    checks.push({
      name: "indexing-off sitemap empty (no url entries)",
      ok: !sm.includes("<url>") || sm.trim() === "" || sm.includes("<urlset") && !/<loc>/.test(sm),
      detail: `len=${sm.length} hasLoc=${/<loc>/.test(sm)}`,
    });
    checks.push({
      name: "indexing-off homepage noindex",
      ok: /noindex/i.test(homeMeta.robots),
      detail: homeMeta.robots || "(empty)",
    });
    console.log("\n=== CHECK SUMMARY (indexing-off) ===");
    for (const c of checks) {
      console.log(`${c.ok ? "PASS" : "FAIL"} | ${c.name} | ${c.detail}`);
    }
    if (checks.some((c) => !c.ok)) process.exitCode = 1;
    return;
  }

  // 1) robots
  for (const host of [acmeHost, betaHost]) {
    const res = await fetchHost(host, "/robots.txt");
    const text = await res.text();
    printSection(`robots.txt @ ${host} (${res.status})`, text.slice(0, 800));
    checks.push({
      name: `robots ${host} 200`,
      ok: res.status === 200,
      detail: String(res.status),
    });
    checks.push({
      name: `robots ${host} has sitemap`,
      ok: text.includes("Sitemap:") && text.includes("/sitemap.xml"),
      detail: text.includes("Sitemap:") ? "yes" : "missing",
    });
    checks.push({
      name: `robots ${host} disallows compara/salvate`,
      ok: text.includes("Disallow: /compara") && text.includes("Disallow: /salvate"),
      detail: "checked",
    });
  }

  // 2) sitemap
  const acmeMap = await (await fetchHost(acmeHost, "/sitemap.xml")).text();
  const betaMap = await (await fetchHost(betaHost, "/sitemap.xml")).text();
  printSection("sitemap acme (head)", acmeMap.slice(0, 1200));
  printSection("sitemap beta (head)", betaMap.slice(0, 1200));
  checks.push({
    name: "sitemap acme contains acme host + vehicle",
    ok:
      acmeMap.includes("acme.localhost:3000") &&
      acmeMap.includes("/vehicles/") &&
      !acmeMap.includes("beta.localhost:3000") &&
      !acmeMap.includes("focus-beta"),
    detail: `len=${acmeMap.length}`,
  });
  checks.push({
    name: "sitemap beta contains beta host + focus-beta, not acme vehicles",
    ok:
      betaMap.includes("beta.localhost:3000") &&
      betaMap.includes("focus-beta") &&
      !betaMap.includes("acme.localhost:3000") &&
      !betaMap.includes("bmw-seria-5"),
    detail: `len=${betaMap.length}`,
  });
  checks.push({
    name: "sitemaps exclude compara/salvate",
    ok: !acmeMap.includes("/compara") && !acmeMap.includes("/salvate"),
    detail: "ok",
  });
  checks.push({
    name: "sitemaps include CMS despre",
    ok: acmeMap.includes("/p/despre") && betaMap.includes("/p/despre"),
    detail: "ok",
  });

  // 3) metadata pages
  const pages = [
    { host: acmeHost, path: "/", label: "homepage acme" },
    {
      host: acmeHost,
      path: "/vehicles/bmw-seria-5-m-sport",
      label: "vehicle acme",
    },
    { host: acmeHost, path: "/p/despre", label: "cms acme" },
    { host: betaHost, path: "/", label: "homepage beta" },
  ] as const;

  for (const p of pages) {
    const res = await fetchHost(p.host, p.path);
    const html = await res.text();
    const meta = extractMeta(html);
    printSection(
      `${p.label} ${p.path} (${res.status})`,
      JSON.stringify(
        {
          title: meta.title,
          robots: meta.robots,
          canonical: meta.canonical,
          ogTitle: meta.ogTitle,
          ogImage: meta.ogImage,
          ogUrl: meta.ogUrl,
          twitterCard: meta.twitterCard,
          twitterSite: meta.twitterSite,
          jsonLdTypes: meta.jsonLdBlocks.map((b) => {
            try {
              const j = JSON.parse(b);
              if (Array.isArray(j)) return j.map((x) => x["@type"]);
              return j["@type"];
            } catch {
              return "parse-error";
            }
          }),
          hasVin: /"vin"/i.test(meta.jsonLdJoined),
        },
        null,
        2,
      ),
    );
    checks.push({
      name: `${p.label} 200`,
      ok: res.status === 200,
      detail: String(res.status),
    });
    checks.push({
      name: `${p.label} has og:title + twitter:card + json-ld`,
      ok: Boolean(meta.ogTitle && meta.twitterCard && meta.jsonLdBlocks.length > 0),
      detail: `og=${Boolean(meta.ogTitle)} tw=${Boolean(meta.twitterCard)} ld=${meta.jsonLdBlocks.length}`,
    });
    if (p.label.includes("acme") && p.path === "/") {
      checks.push({
        name: "homepage acme uses SEO title/desc/OG A",
        ok:
          meta.title.includes("ACME SEO A") &&
          meta.ogImage.includes("og-a.jpg") &&
          meta.twitterSite === "@tenant_a",
        detail: meta.title,
      });
    }
    if (p.label === "homepage beta") {
      checks.push({
        name: "homepage beta isolated SEO B (not A)",
        ok:
          meta.title.includes("Beta Autos SEO B") &&
          meta.ogImage.includes("og-b.jpg") &&
          !meta.ogImage.includes("og-a.jpg") &&
          meta.twitterSite === "@tenant_b",
        detail: meta.title,
      });
    }
    if (p.label === "cms acme") {
      checks.push({
        name: "cms uses title template",
        ok: meta.title.includes("Despre ACME SEO") && meta.title.includes("ACME"),
        detail: meta.title,
      });
    }
    checks.push({
      name: `${p.label} JSON-LD has no VIN`,
      ok: !/"vin"/i.test(meta.jsonLdJoined),
      detail: "ok",
    });
  }

  // 4) noindex compara/salvate
  for (const path of ["/compara", "/salvate"]) {
    const res = await fetchHost(acmeHost, path);
    const meta = extractMeta(await res.text());
    printSection(`${path} robots`, `${res.status} robots=${meta.robots} title=${meta.title}`);
    checks.push({
      name: `${path} noindex`,
      ok: /noindex/i.test(meta.robots),
      detail: meta.robots || "(empty robots meta)",
    });
  }

  // Summary so far before indexing toggle (caller runs separate for off)
  console.log("\n=== CHECK SUMMARY (pre indexing-off) ===");
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} | ${c.name} | ${c.detail}`);
  }
  const failed = checks.filter((c) => !c.ok);
  console.log(`\nTotal ${checks.length}, failed ${failed.length}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
