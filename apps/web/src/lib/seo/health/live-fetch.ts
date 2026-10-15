import type { SeoHealthLiveSnapshot } from "@/lib/seo/health/types";

function smokeBaseUrl(): string {
  return (
    process.env.SEO_HEALTH_FETCH_BASE?.trim() ||
    process.env.SMOKE_BASE?.trim() ||
    "http://127.0.0.1:3000"
  );
}

function rootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "localhost:3000";
}

/** Build Host header for tenant storefront (slug.root). */
export function tenantStorefrontHost(tenantSlug: string): string {
  const root = rootDomain();
  if (root.startsWith("localhost") || root.startsWith("127.")) {
    return `${tenantSlug}.${root}`;
  }
  return `${tenantSlug}.${root}`;
}

async function fetchHost(host: string, path: string): Promise<{ status: number; text: string }> {
  const base = smokeBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    headers: {
      Host: host,
      "x-forwarded-host": host,
      "x-forwarded-proto": base.startsWith("https") ? "https" : "http",
    },
    redirect: "manual",
    cache: "no-store",
  });
  return { status: res.status, text: await res.text() };
}

/**
 * Best-effort live probes against the running web server with Host tenancy.
 * Failures are recorded — never throw to the dashboard.
 */
export async function fetchSeoHealthLiveSnapshot(options: {
  tenantSlug: string;
  draftSlug?: string | null;
}): Promise<SeoHealthLiveSnapshot> {
  const host = tenantStorefrontHost(options.tenantSlug);
  const errors: string[] = [];
  const out: SeoHealthLiveSnapshot = { fetchErrors: errors };

  try {
    const home = await fetchHost(host, "/");
    if (home.status >= 200 && home.status < 400) out.homepageHtml = home.text;
    else errors.push(`homepage HTTP ${home.status}`);
  } catch (e) {
    errors.push(`homepage: ${e instanceof Error ? e.message : "fetch failed"}`);
  }

  try {
    const robots = await fetchHost(host, "/robots.txt");
    if (robots.status === 200) out.robotsTxt = robots.text;
    else errors.push(`robots HTTP ${robots.status}`);
  } catch (e) {
    errors.push(`robots: ${e instanceof Error ? e.message : "fetch failed"}`);
  }

  try {
    const sm = await fetchHost(host, "/sitemap.xml");
    if (sm.status === 200) out.sitemapXml = sm.text;
    else errors.push(`sitemap HTTP ${sm.status}`);
  } catch (e) {
    errors.push(`sitemap: ${e instanceof Error ? e.message : "fetch failed"}`);
  }

  try {
    const compara = await fetchHost(host, "/compara");
    if (compara.status < 500) out.comparaHtml = compara.text;
  } catch (e) {
    errors.push(`compara: ${e instanceof Error ? e.message : "fetch failed"}`);
  }

  try {
    const salvate = await fetchHost(host, "/salvate");
    if (salvate.status < 500) out.salvateHtml = salvate.text;
  } catch (e) {
    errors.push(`salvate: ${e instanceof Error ? e.message : "fetch failed"}`);
  }

  if (options.draftSlug) {
    try {
      const probe = await fetchHost(host, `/p/${options.draftSlug}`);
      out.draftProbe = { slug: options.draftSlug, status: probe.status };
    } catch (e) {
      errors.push(`draftProbe: ${e instanceof Error ? e.message : "fetch failed"}`);
    }
  }

  if (errors.length === 0) delete out.fetchErrors;
  return out;
}
