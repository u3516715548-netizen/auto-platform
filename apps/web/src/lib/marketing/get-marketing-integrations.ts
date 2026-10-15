import { eq } from "drizzle-orm";
import { getDb, tenantMarketingIntegrations, withTenantContext } from "@auto-platform/db";
import type { MembershipSession } from "@/lib/auth/require-membership";

export type MarketingIntegrationsForForm = {
  gtmContainerId: string;
  gtmEnabled: boolean;
  ga4MeasurementId: string;
  ga4Enabled: boolean;
  googleAdsConversionId: string;
  googleAdsConversionLabel: string;
  googleAdsEnabled: boolean;
  metaPixelId: string;
  metaPixelEnabled: boolean;
  tiktokPixelId: string;
  tiktokPixelEnabled: boolean;
  linkedinPartnerId: string;
  linkedinEnabled: boolean;
  googleSearchConsoleVerification: string;
  bingWebmasterVerification: string;
  metaDomainVerification: string;
  pinterestVerification: string;
};

const EMPTY: MarketingIntegrationsForForm = {
  gtmContainerId: "",
  gtmEnabled: true,
  ga4MeasurementId: "",
  ga4Enabled: true,
  googleAdsConversionId: "",
  googleAdsConversionLabel: "",
  googleAdsEnabled: true,
  metaPixelId: "",
  metaPixelEnabled: true,
  tiktokPixelId: "",
  tiktokPixelEnabled: true,
  linkedinPartnerId: "",
  linkedinEnabled: true,
  googleSearchConsoleVerification: "",
  bingWebmasterVerification: "",
  metaDomainVerification: "",
  pinterestVerification: "",
};

/**
 * Owner-scoped load for Marketing settings forms.
 * Relies on RLS owner SELECT + caller must use requireSettingsOwner.
 */
export async function getMarketingIntegrationsForSettings(
  session: MembershipSession,
): Promise<MarketingIntegrationsForForm> {
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const row = await withTenantContext(
    getDb(),
    { profileId, tenantId },
    async (db) =>
      db.query.tenantMarketingIntegrations.findFirst({
        where: eq(tenantMarketingIntegrations.tenantId, tenantId),
      }),
  );

  if (!row) return { ...EMPTY };

  return {
    gtmContainerId: row.gtmContainerId ?? "",
    gtmEnabled: row.gtmEnabled ?? true,
    ga4MeasurementId: row.ga4MeasurementId ?? "",
    ga4Enabled: row.ga4Enabled ?? true,
    googleAdsConversionId: row.googleAdsConversionId ?? "",
    googleAdsConversionLabel: row.googleAdsConversionLabel ?? "",
    googleAdsEnabled: row.googleAdsEnabled ?? true,
    metaPixelId: row.metaPixelId ?? "",
    metaPixelEnabled: row.metaPixelEnabled ?? true,
    tiktokPixelId: row.tiktokPixelId ?? "",
    tiktokPixelEnabled: row.tiktokPixelEnabled ?? true,
    linkedinPartnerId: row.linkedinPartnerId ?? "",
    linkedinEnabled: row.linkedinEnabled ?? true,
    googleSearchConsoleVerification: row.googleSearchConsoleVerification ?? "",
    bingWebmasterVerification: row.bingWebmasterVerification ?? "",
    metaDomainVerification: row.metaDomainVerification ?? "",
    pinterestVerification: row.pinterestVerification ?? "",
  };
}
