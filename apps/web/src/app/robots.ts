import type { MetadataRoute } from "next";
import { loadPublicSeoSettings } from "@/lib/seo/load-public-seo-settings";
import { getPublicRequestOrigin } from "@/lib/seo/public-origin";
import { resolvePublicTenantFromHost } from "@/lib/storefront/resolve-public-tenant";

/**
 * Host-aware robots.txt.
 * - Tenant: respects indexing_enabled; always disallows dashboard/auth/tools.
 * - Apex: allow marketing pages; no tenant sitemap.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getPublicRequestOrigin();
  // Robots `Host:` expects hostname (optionally with port), not a full URL.
  const hostName = new URL(origin).host;
  const resolved = await resolvePublicTenantFromHost();

  if (resolved.kind === "apex") {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/login", "/checkout/", "/onboarding/", "/api/"],
      },
      host: hostName,
    };
  }

  if (resolved.kind !== "ok") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  const seo = await loadPublicSeoSettings(resolved.tenant.tenantId);
  if (seo.indexingEnabled === false) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      host: hostName,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/login",
        "/checkout/",
        "/onboarding/",
        "/api/",
        "/compara",
        "/salvate",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: hostName,
  };
}
