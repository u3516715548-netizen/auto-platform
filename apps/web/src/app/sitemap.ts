import type { MetadataRoute } from "next";
import { loadPublicSeoSettings } from "@/lib/seo/load-public-seo-settings";
import {
  listPublicAvailableVehicleSitemapEntries,
  listPublicPublishedPageSitemapEntries,
} from "@/lib/seo/list-public-sitemap-entries";
import { getPublicRequestOrigin } from "@/lib/seo/public-origin";
import { resolvePublicTenantFromHost } from "@/lib/storefront/resolve-public-tenant";

/**
 * Host-aware sitemap.
 * - Tenant (indexing on): `/`, published CMS pages, available vehicles.
 * - Never includes `/compara`, `/salvate`, dashboard, or filter query URLs.
 * - Apex / indexing off / unknown host → empty.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const resolved = await resolvePublicTenantFromHost();
  if (resolved.kind !== "ok") {
    return [];
  }

  const seo = await loadPublicSeoSettings(resolved.tenant.tenantId);
  if (seo.indexingEnabled === false) {
    return [];
  }

  const origin = await getPublicRequestOrigin();
  const [pages, vehicleEntries] = await Promise.all([
    listPublicPublishedPageSitemapEntries(resolved.tenant.tenantId),
    listPublicAvailableVehicleSitemapEntries(resolved.tenant.tenantId),
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${origin}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    ...pages.map((page) => ({
      url: `${origin}${page.path}`,
      lastModified: page.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...vehicleEntries.map((vehicle) => ({
      url: `${origin}${vehicle.path}`,
      lastModified: vehicle.lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  return entries;
}
