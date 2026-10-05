"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import {
  updateTenantBrandingAction,
  type UpdateTenantBrandingState,
} from "@/lib/tenant/update-tenant-branding";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { nativeSelectClassName } from "@/lib/ui/form-styles";
import type { StaffBrandingSettings } from "@/lib/tenant/get-tenant-branding";
import type { StorefrontTemplateDefinition } from "@/lib/storefront/templates/registry";

const initialState: UpdateTenantBrandingState = { error: null, success: false };

type BrandingSettingsFormProps = {
  branding: StaffBrandingSettings;
  templates: StorefrontTemplateDefinition[];
  readOnly: boolean;
};

export function BrandingSettingsForm({
  branding,
  templates,
  readOnly,
}: BrandingSettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateTenantBrandingAction,
    initialState,
  );
  const emails = branding.leadNotificationEmails;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {state?.error ? (
        <FeedbackBanner variant="error">{state.error}</FeedbackBanner>
      ) : null}
      {state?.success ? (
        <FeedbackBanner variant="success">
          Branding-ul a fost salvat.
        </FeedbackBanner>
      ) : null}

      {readOnly ? (
        <FeedbackBanner variant="info">
          Doar proprietarul poate modifica branding-ul dealerului.
        </FeedbackBanner>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branding-primaryColor">Culoare principală</Label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="branding-primaryColor-picker"
            type="color"
            disabled={readOnly || pending}
            defaultValue={
              branding.primaryColor.length === 4
                ? `#${branding.primaryColor[1]}${branding.primaryColor[1]}${branding.primaryColor[2]}${branding.primaryColor[2]}${branding.primaryColor[3]}${branding.primaryColor[3]}`
                : branding.primaryColor
            }
            className="h-11 w-14 cursor-pointer rounded-md border border-zinc-200 bg-white p-1 disabled:cursor-not-allowed"
            aria-label="Selector culoare principală"
            onChange={(event) => {
              const text = document.getElementById(
                "branding-primaryColor",
              ) as HTMLInputElement | null;
              if (text) text.value = event.target.value;
            }}
          />
          <Input
            id="branding-primaryColor"
            name="primaryColor"
            type="text"
            disabled={readOnly || pending}
            defaultValue={branding.primaryColor}
            maxLength={7}
            placeholder="#2563eb"
            className="min-h-11 max-w-[10rem] font-mono"
            aria-describedby="branding-primaryColor-hint"
          />
        </div>
        <p id="branding-primaryColor-hint" className="text-xs text-zinc-500">
          Hex valid, ex. #2563eb. Este singura culoare personalizabilă per dealer.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branding-templateId">Template storefront</Label>
        <select
          id="branding-templateId"
          name="templateId"
          disabled={readOnly || pending}
          defaultValue={branding.templateId}
          className={nativeSelectClassName}
        >
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.labelRo}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branding-phone">Telefon public</Label>
        <Input
          id="branding-phone"
          name="phone"
          type="tel"
          disabled={readOnly || pending}
          defaultValue={branding.phone ?? ""}
          placeholder="0722 123 456"
          maxLength={40}
          autoComplete="tel"
        />
        <p className="text-xs text-zinc-500">Lasă gol pentru a șterge numărul public.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branding-whatsapp">WhatsApp public</Label>
        <Input
          id="branding-whatsapp"
          name="whatsapp"
          type="tel"
          disabled={readOnly || pending}
          defaultValue={branding.whatsapp ?? ""}
          placeholder="0722 123 456"
          maxLength={40}
        />
        <p className="text-xs text-zinc-500">
          Număr, nu link. Lasă gol pentru a șterge WhatsApp-ul public.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 sm:p-4">
        <legend className="px-1 text-sm font-semibold text-zinc-900">
          Email-uri notificare lead-uri
        </legend>
        <p id="lead-notify-hint" className="text-xs leading-5 text-zinc-500">
          Maximum 3 adrese. Lista goală este permisă — lead-urile se salvează, dar nu se trimite
          email. Aceste adrese nu apar pe site-ul public.
        </p>
        {([1, 2, 3] as const).map((slot) => {
          const id = `leadNotificationEmail${slot}`;
          const name = `leadNotificationEmail${slot}` as const;
          return (
            <div key={id} className="flex flex-col gap-1.5">
              <Label htmlFor={id}>Destinatar {slot}</Label>
              <Input
                id={id}
                name={name}
                type="email"
                inputMode="email"
                disabled={readOnly || pending}
                defaultValue={emails[slot - 1] ?? ""}
                placeholder="dealer@exemplu.ro"
                maxLength={160}
                autoComplete="off"
                aria-describedby="lead-notify-hint"
              />
            </div>
          );
        })}
      </fieldset>

      {!readOnly ? (
        <Button type="submit" disabled={pending} className="min-h-11 w-fit">
          {pending ? "Se salvează…" : "Salvează branding"}
        </Button>
      ) : null}
    </form>
  );
}
