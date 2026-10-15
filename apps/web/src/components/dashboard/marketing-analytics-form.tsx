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

function EnabledToggle({
  id,
  name,
  defaultChecked,
  pending,
}: {
  id: string;
  name: string;
  defaultChecked: boolean;
  pending: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700">
      <input
        id={id}
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={pending}
      />
      Activ (pregătit pentru încărcare ulterioară — nu rulează încă pe storefront)
    </label>
  );
}

export function MarketingAnalyticsForm({ settings }: Props) {
  const [state, formAction, pending] = useActionState(
    upsertMarketingIntegrationsAction,
    initial,
  );

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}
      {state?.success ? (
        <FeedbackBanner variant="success">Integrările Analytics & Ads au fost salvate.</FeedbackBanner>
      ) : null}

      <form action={formAction} className="flex flex-col gap-6">
        {/* Preserve verification fields when saving analytics-only form */}
        <input
          type="hidden"
          name="googleSearchConsoleVerification"
          value={settings.googleSearchConsoleVerification}
        />
        <input
          type="hidden"
          name="bingWebmasterVerification"
          value={settings.bingWebmasterVerification}
        />
        <input
          type="hidden"
          name="metaDomainVerification"
          value={settings.metaDomainVerification}
        />
        <input type="hidden" name="pinterestVerification" value={settings.pinterestVerification} />

        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-zinc-900">Google Tag Manager</h3>
          <p className="text-sm text-zinc-600">
            Container ID (recomandat ca layer principal). Format: GTM-XXXXXXX.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gtm">Container ID</Label>
            <Input
              id="gtm"
              name="gtmContainerId"
              defaultValue={settings.gtmContainerId}
              maxLength={32}
              placeholder="GTM-XXXXXXX"
              disabled={pending}
              autoComplete="off"
            />
          </div>
          <EnabledToggle
            id="gtm-enabled"
            name="gtmEnabled"
            defaultChecked={settings.gtmEnabled}
            pending={pending}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-zinc-900">Google Analytics 4</h3>
          <p className="text-sm text-zinc-600">Measurement ID. Format: G-XXXXXXXX.</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ga4">Measurement ID</Label>
            <Input
              id="ga4"
              name="ga4MeasurementId"
              defaultValue={settings.ga4MeasurementId}
              maxLength={32}
              placeholder="G-XXXXXXXX"
              disabled={pending}
              autoComplete="off"
            />
          </div>
          <EnabledToggle
            id="ga4-enabled"
            name="ga4Enabled"
            defaultChecked={settings.ga4Enabled}
            pending={pending}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-zinc-900">Google Ads</h3>
          <p className="text-sm text-zinc-600">
            Conversion ID (AW-…) și label opțional. Label-ul necesită ID.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ads-id">Conversion ID</Label>
            <Input
              id="ads-id"
              name="googleAdsConversionId"
              defaultValue={settings.googleAdsConversionId}
              maxLength={32}
              placeholder="AW-123456789"
              disabled={pending}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ads-label">Conversion Label</Label>
            <Input
              id="ads-label"
              name="googleAdsConversionLabel"
              defaultValue={settings.googleAdsConversionLabel}
              maxLength={64}
              disabled={pending}
              autoComplete="off"
            />
          </div>
          <EnabledToggle
            id="ads-enabled"
            name="googleAdsEnabled"
            defaultChecked={settings.googleAdsEnabled}
            pending={pending}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-zinc-900">Meta Pixel</h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meta">Pixel ID</Label>
            <Input
              id="meta"
              name="metaPixelId"
              defaultValue={settings.metaPixelId}
              maxLength={32}
              placeholder="123456789012345"
              disabled={pending}
              autoComplete="off"
            />
          </div>
          <EnabledToggle
            id="meta-enabled"
            name="metaPixelEnabled"
            defaultChecked={settings.metaPixelEnabled}
            pending={pending}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-zinc-900">TikTok Pixel</h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tiktok">Pixel ID</Label>
            <Input
              id="tiktok"
              name="tiktokPixelId"
              defaultValue={settings.tiktokPixelId}
              maxLength={64}
              disabled={pending}
              autoComplete="off"
            />
          </div>
          <EnabledToggle
            id="tiktok-enabled"
            name="tiktokPixelEnabled"
            defaultChecked={settings.tiktokPixelEnabled}
            pending={pending}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-zinc-900">LinkedIn Insight</h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="linkedin">Partner ID</Label>
            <Input
              id="linkedin"
              name="linkedinPartnerId"
              defaultValue={settings.linkedinPartnerId}
              maxLength={32}
              placeholder="1234567"
              disabled={pending}
              autoComplete="off"
            />
          </div>
          <EnabledToggle
            id="linkedin-enabled"
            name="linkedinEnabled"
            defaultChecked={settings.linkedinEnabled}
            pending={pending}
          />
        </section>

        <p className="text-xs text-zinc-500">
          Lasă un câmp gol și salvează pentru a șterge valoarea. Tracking-ul nu se încarcă pe
          storefront până la faza Consent.
        </p>

        <Button type="submit" disabled={pending}>
          {pending ? "Se salvează…" : "Salvează Analytics & Ads"}
        </Button>
      </form>
    </div>
  );
}
