import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { getMarketingIntegrationsForSettings } from "@/lib/marketing/get-marketing-integrations";
import { MarketingVerificationForm } from "@/components/dashboard/marketing-verification-form";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

export default async function DashboardMarketingVerificationPage() {
  const session = await requireSettingsOwner();
  const settings = await getMarketingIntegrationsForSettings(session);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">Marketing</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Verification</h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600">
          Token-uri de verificare pentru Search Console, Bing, Meta și Pinterest —{" "}
          <span className="font-medium text-zinc-800">{session.tenant.name}</span>.
        </p>
      </section>

      <FeedbackBanner variant="info">
        Tag-urile nu sunt încă injectate în head-ul public. Se vor lega în Tracking Phase după
        Consent.
      </FeedbackBanner>

      <MarketingVerificationForm settings={settings} />
    </div>
  );
}
