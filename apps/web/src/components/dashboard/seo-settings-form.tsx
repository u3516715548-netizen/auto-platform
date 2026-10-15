"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import {
  upsertSeoSettingsAction,
  type UpsertSeoSettingsState,
} from "@/lib/seo/upsert-seo-settings";
import type { SeoSettingsForForm } from "@/lib/seo/get-seo-settings";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const initial: UpsertSeoSettingsState = { error: null, success: false };

type SeoSettingsFormProps = {
  settings: SeoSettingsForForm;
};

export function SeoSettingsForm({ settings }: SeoSettingsFormProps) {
  const [state, formAction, pending] = useActionState(upsertSeoSettingsAction, initial);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}
      {state?.success ? (
        <FeedbackBanner variant="success">Setările SEO au fost salvate.</FeedbackBanner>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seo-title">Titlu SEO implicit</Label>
          <Input
            id="seo-title"
            name="seoTitleDefault"
            defaultValue={settings.seoTitleDefault}
            maxLength={70}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seo-description">Descriere SEO implicită</Label>
          <Input
            id="seo-description"
            name="seoDescriptionDefault"
            defaultValue={settings.seoDescriptionDefault}
            maxLength={160}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seo-title-template">Template titlu (opțional)</Label>
          <Input
            id="seo-title-template"
            name="titleTemplate"
            defaultValue={settings.titleTemplate}
            maxLength={80}
            placeholder="%s | {dealer}"
            disabled={pending}
          />
          <p className="text-xs text-zinc-500">
            Folosește <code className="rounded bg-zinc-100 px-1">%s</code> pentru titlul paginii și{" "}
            <code className="rounded bg-zinc-100 px-1">{"{dealer}"}</code> pentru numele dealerului.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seo-favicon">Favicon (cale / URL https)</Label>
          <Input
            id="seo-favicon"
            name="faviconPath"
            defaultValue={settings.faviconPath}
            maxLength={500}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seo-og-image">Imagine Open Graph (cale / URL https)</Label>
          <Input
            id="seo-og-image"
            name="ogImagePath"
            defaultValue={settings.ogImagePath}
            maxLength={500}
            disabled={pending}
          />
          <p className="text-xs text-zinc-500">
            Fallback social preview. Preferă un URL https stabil (nu link-uri semnate expirabile).
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seo-twitter">Twitter / X handle (opțional)</Label>
          <Input
            id="seo-twitter"
            name="twitterHandle"
            defaultValue={settings.twitterHandle}
            maxLength={15}
            placeholder="dealerulmeu"
            disabled={pending}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="indexingEnabled"
            defaultChecked={settings.indexingEnabled}
            disabled={pending}
          />
          Indexare activă (când e debifat: noindex pe pagini + robots disallow + sitemap gol)
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Se salvează…" : "Salvează SEO"}
        </Button>
      </form>
    </div>
  );
}
