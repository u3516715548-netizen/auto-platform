"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import {
  upsertMarketingIntegrationsAction,
  type UpsertMarketingIntegrationsState,
} from "@/lib/marketing/upsert-marketing-integrations";
import type { MarketingIntegrationsForForm } from "@/lib/marketing/get-marketing-integrations";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const initial: UpsertMarketingIntegrationsState = { error: null, success: false };

type Props = {
  settings: MarketingIntegrationsForForm;
};

export function MarketingVerificationForm({ settings }: Props) {
  const [state, formAction, pending] = useActionState(
    upsertMarketingIntegrationsAction,
    initial,
  );

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}
      {state?.success ? (
        <FeedbackBanner variant="success">Tag-urile de verificare au fost salvate.</FeedbackBanner>
      ) : null}

      <form action={formAction} className="flex flex-col gap-6">
        {/* Preserve analytics fields when saving verification-only form */}
        <input type="hidden" name="gtmContainerId" value={settings.gtmContainerId} />
        <input type="hidden" name="gtmEnabled" value={settings.gtmEnabled ? "on" : ""} />
        <input type="hidden" name="ga4MeasurementId" value={settings.ga4MeasurementId} />
        <input type="hidden" name="ga4Enabled" value={settings.ga4Enabled ? "on" : ""} />
        <input
          type="hidden"
          name="googleAdsConversionId"
          value={settings.googleAdsConversionId}
        />
        <input
          type="hidden"
          name="googleAdsConversionLabel"
          value={settings.googleAdsConversionLabel}
        />
        <input
          type="hidden"
          name="googleAdsEnabled"
          value={settings.googleAdsEnabled ? "on" : ""}
        />
        <input type="hidden" name="metaPixelId" value={settings.metaPixelId} />
        <input type="hidden" name="metaPixelEnabled" value={settings.metaPixelEnabled ? "on" : ""} />
        <input type="hidden" name="tiktokPixelId" value={settings.tiktokPixelId} />
        <input
          type="hidden"
          name="tiktokPixelEnabled"
          value={settings.tiktokPixelEnabled ? "on" : ""}
        />
        <input type="hidden" name="linkedinPartnerId" value={settings.linkedinPartnerId} />
        <input type="hidden" name="linkedinEnabled" value={settings.linkedinEnabled ? "on" : ""} />

        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-zinc-900">Google Search Console</h3>
          <p className="text-sm text-zinc-600">
            Conținutul meta <code className="rounded bg-zinc-100 px-1">google-site-verification</code>
            . Injectarea publică urmează după Consent / Tracking.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gsc">Verification token</Label>
            <Input
              id="gsc"
              name="googleSearchConsoleVerification"
              defaultValue={settings.googleSearchConsoleVerification}
              maxLength={200}
              disabled={pending}
              autoComplete="off"
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-zinc-900">Bing Webmaster</h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bing">Verification token</Label>
            <Input
              id="bing"
              name="bingWebmasterVerification"
              defaultValue={settings.bingWebmasterVerification}
              maxLength={200}
              disabled={pending}
              autoComplete="off"
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-zinc-900">Meta domain verification</h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meta-domain">Verification token</Label>
            <Input
              id="meta-domain"
              name="metaDomainVerification"
              defaultValue={settings.metaDomainVerification}
              maxLength={200}
              disabled={pending}
              autoComplete="off"
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-zinc-900">Pinterest</h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pinterest">Verification token</Label>
            <Input
              id="pinterest"
              name="pinterestVerification"
              defaultValue={settings.pinterestVerification}
              maxLength={200}
              disabled={pending}
              autoComplete="off"
            />
          </div>
        </section>

        <p className="text-xs text-zinc-500">
          Gol + Salvează șterge token-ul. Fără HTML/script. Nu sunt încă injectate în head-ul public.
        </p>

        <Button type="submit" disabled={pending}>
          {pending ? "Se salvează…" : "Salvează Verification"}
        </Button>
      </form>
    </div>
  );
}
