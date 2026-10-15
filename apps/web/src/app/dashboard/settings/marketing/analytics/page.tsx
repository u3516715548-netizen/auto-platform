import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getMarketingIntegrationsForSettings } from "@/lib/marketing/get-marketing-integrations";
import { MarketingAnalyticsForm } from "@/components/dashboard/marketing-analytics-form";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

export default async function DashboardMarketingAnalyticsPage() {
  const session = await requireSettingsOwner();
  const settings = await getMarketingIntegrationsForSettings(session);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Marketing</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Analytics & Ads</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          GTM, GA4, Google Ads, Meta, TikTok și LinkedIn pentru{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span>. Doar ID-uri —
          fără scripturi custom.
        </p>
      </section>

      <FeedbackBanner variant="info">
        Valorile se salvează acum, dar nu se încarcă pe storefront până după Consent.
      </FeedbackBanner>

      <MarketingAnalyticsForm settings={settings} />
    </div>
  );
}
