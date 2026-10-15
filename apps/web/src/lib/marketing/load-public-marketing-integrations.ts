import { sql } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@auto-platform/db";
import type { PublicMarketingRuntimeView } from "@auto-platform/types";
import { withPerfSpan } from "@/lib/perf/server-timing";
import { clearPublicSessionGucs } from "@/lib/storefront/clear-public-session";

type MarketingRow = {
  gtm_container_id: string | null;
  gtm_enabled: boolean;
  ga4_measurement_id: string | null;
  ga4_enabled: boolean;
  google_ads_conversion_id: string | null;
  google_ads_conversion_label: string | null;
  google_ads_enabled: boolean;
  meta_pixel_id: string | null;
  meta_pixel_enabled: boolean;
  tiktok_pixel_id: string | null;
  tiktok_pixel_enabled: boolean;
  linkedin_partner_id: string | null;
  linkedin_enabled: boolean;
  google_search_console_verification: string | null;
  bing_webmaster_verification: string | null;
  meta_domain_verification: string | null;
  pinterest_verification: string | null;
};

function pickEnabled(id: string | null, enabled: boolean): string | undefined {
  if (!enabled || !id?.trim()) return undefined;
  return id.trim();
}

/**
 * Public marketing whitelist via SECURITY DEFINER — never full-row anon SELECT.
 * Returns only enabled IDs + verification tokens for Host tenant.
 */
export const loadPublicMarketingIntegrations = cache(
  async (tenantId: string): Promise<PublicMarketingRuntimeView> => {
    return withPerfSpan("marketing.public", async () => {
      const db = getDb();
      await clearPublicSessionGucs(db);

      const rows = await db.execute<MarketingRow>(sql`
        select * from app.public_marketing_integrations(${tenantId}::uuid)
      `);
      const list = Array.from(rows as unknown as MarketingRow[]);
      const row = list[0];
      if (!row) {
        return { verification: {}, preferGtm: false };
      }

      const gtmContainerId = pickEnabled(row.gtm_container_id, row.gtm_enabled !== false);
      const view: PublicMarketingRuntimeView = {
        ...(gtmContainerId ? { gtmContainerId } : {}),
        ...(pickEnabled(row.ga4_measurement_id, row.ga4_enabled !== false)
          ? { ga4MeasurementId: pickEnabled(row.ga4_measurement_id, row.ga4_enabled !== false) }
          : {}),
        ...(pickEnabled(row.google_ads_conversion_id, row.google_ads_enabled !== false)
          ? {
              googleAdsConversionId: pickEnabled(
                row.google_ads_conversion_id,
                row.google_ads_enabled !== false,
              ),
              ...(row.google_ads_conversion_label?.trim()
                ? { googleAdsConversionLabel: row.google_ads_conversion_label.trim() }
                : {}),
            }
          : {}),
        ...(pickEnabled(row.meta_pixel_id, row.meta_pixel_enabled !== false)
          ? { metaPixelId: pickEnabled(row.meta_pixel_id, row.meta_pixel_enabled !== false) }
          : {}),
        ...(pickEnabled(row.tiktok_pixel_id, row.tiktok_pixel_enabled !== false)
          ? { tiktokPixelId: pickEnabled(row.tiktok_pixel_id, row.tiktok_pixel_enabled !== false) }
          : {}),
        ...(pickEnabled(row.linkedin_partner_id, row.linkedin_enabled !== false)
          ? {
              linkedinPartnerId: pickEnabled(
                row.linkedin_partner_id,
                row.linkedin_enabled !== false,
              ),
            }
          : {}),
        verification: {
          ...(row.google_search_console_verification?.trim()
            ? { google: row.google_search_console_verification.trim() }
            : {}),
          ...(row.bing_webmaster_verification?.trim()
            ? { bing: row.bing_webmaster_verification.trim() }
            : {}),
          ...(row.meta_domain_verification?.trim()
            ? { metaDomain: row.meta_domain_verification.trim() }
            : {}),
          ...(row.pinterest_verification?.trim()
            ? { pinterest: row.pinterest_verification.trim() }
            : {}),
        },
        preferGtm: Boolean(gtmContainerId),
      };
      return view;
    });
  },
);
