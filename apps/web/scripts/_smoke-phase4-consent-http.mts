const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3000";

async function fetchHost(host: string, path: string) {
  return fetch(`${BASE}${path}`, {
    headers: {
      Host: host,
      "x-forwarded-host": host,
      "x-forwarded-proto": "http",
    },
  });
}

function robotsMeta(html: string): string {
  return (
    html.match(/name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/content=["']([^"']+)["'][^>]+name=["']robots["']/i)?.[1] ??
    ""
  );
}

async function main() {
  const acme = "acme.localhost:3000";
  const beta = "beta.localhost:3000";
  const acmeHome = await (await fetchHost(acme, "/")).text();
  const betaHome = await (await fetchHost(beta, "/")).text();
  const compara = await (await fetchHost(acme, "/compara")).text();

  const hasBannerCopy =
    acmeHome.includes("Cookie-uri") ||
    acmeHome.includes("Accept") ||
    acmeHome.includes("Personalizeaz");
  const hasRuntimeSlot = acmeHome.includes("StorefrontMarketingRuntime");
  console.log(
    "debug_accept_idx",
    acmeHome.indexOf("Accept"),
    "cookie_uri",
    acmeHome.indexOf("Cookie-uri"),
    "runtime",
    acmeHome.indexOf("StorefrontMarketingRuntime"),
  );
  const checks: Array<[string, boolean]> = [
    ["banner_or_runtime_slot", hasBannerCopy || hasRuntimeSlot],
    ["banner_ssr_copy", hasBannerCopy],
    ["gsc_acme", acmeHome.includes("gsc-acme-token")],
    ["gsc_isolated", !acmeHome.includes("gsc-beta-token")],
    ["gsc_beta", betaHome.includes("gsc-beta-token")],
    ["no_gtm_before_consent", !acmeHome.includes("googletagmanager.com/gtm.js")],
    ["no_disabled_pixel_id", !acmeHome.includes("999888777666555")],
    ["jsonld", acmeHome.includes("application/ld+json")],
    ["compara_noindex", /noindex/i.test(robotsMeta(compara))],
  ];

  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"} | ${name}`);
    if (!ok) failed += 1;
  }
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
