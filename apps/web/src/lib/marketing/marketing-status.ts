import { marketingIntegrationStatus, type MarketingIntegrationStatus } from "@auto-platform/types";
import type { MarketingIntegrationsForForm } from "./get-marketing-integrations";

export type MarketingStatusCard = {
  key: string;
  label: string;
  status: MarketingIntegrationStatus;
  href: string;
};

export function buildMarketingOverviewStatus(
  settings: MarketingIntegrationsForForm,
): MarketingStatusCard[] {
  return [
    {
      key: "gtm",
      label: "Google Tag Manager",
      status: marketingIntegrationStatus(settings.gtmContainerId, settings.gtmEnabled),
      href: "/dashboard/settings/marketing/analytics",
    },
    {
      key: "ga4",
      label: "Google Analytics 4",
      status: marketingIntegrationStatus(settings.ga4MeasurementId, settings.ga4Enabled),
      href: "/dashboard/settings/marketing/analytics",
    },
    {
      key: "ads",
      label: "Google Ads",
      status: marketingIntegrationStatus(
        settings.googleAdsConversionId,
        settings.googleAdsEnabled,
      ),
      href: "/dashboard/settings/marketing/analytics",
    },
    {
      key: "meta",
      label: "Meta Pixel",
      status: marketingIntegrationStatus(settings.metaPixelId, settings.metaPixelEnabled),
      href: "/dashboard/settings/marketing/analytics",
    },
    {
      key: "tiktok",
      label: "TikTok Pixel",
      status: marketingIntegrationStatus(settings.tiktokPixelId, settings.tiktokPixelEnabled),
      href: "/dashboard/settings/marketing/analytics",
    },
    {
      key: "linkedin",
      label: "LinkedIn Insight",
      status: marketingIntegrationStatus(settings.linkedinPartnerId, settings.linkedinEnabled),
      href: "/dashboard/settings/marketing/analytics",
    },
    {
      key: "gsc",
      label: "Search Console",
      status: marketingIntegrationStatus(settings.googleSearchConsoleVerification, true),
      href: "/dashboard/settings/marketing/verification",
    },
    {
      key: "bing",
      label: "Bing Webmaster",
      status: marketingIntegrationStatus(settings.bingWebmasterVerification, true),
      href: "/dashboard/settings/marketing/verification",
    },
    {
      key: "meta-domain",
      label: "Meta domain",
      status: marketingIntegrationStatus(settings.metaDomainVerification, true),
      href: "/dashboard/settings/marketing/verification",
    },
    {
      key: "pinterest",
      label: "Pinterest",
      status: marketingIntegrationStatus(settings.pinterestVerification, true),
      href: "/dashboard/settings/marketing/verification",
    },
  ];
}

export function marketingStatusLabelRo(status: MarketingIntegrationStatus): string {
  switch (status) {
    case "configured":
      return "Configurat";
    case "disabled":
      return "Dezactivat";
    default:
      return "Neconfigurat";
  }
}
