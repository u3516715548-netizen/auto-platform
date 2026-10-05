"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import {
  createPublicLeadAction,
  type CreatePublicLeadState,
} from "@/lib/storefront/create-public-lead";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const initialState: CreatePublicLeadState = { error: null, success: false };

type PublicLeadFormProps = {
  vehicleSlug: string;
  accent?: string | null;
  disabled?: boolean;
  disabledMessage?: string;
};

export function PublicLeadForm({
  vehicleSlug,
  accent,
  disabled = false,
  disabledMessage,
}: PublicLeadFormProps) {
  const boundAction = createPublicLeadAction.bind(null, vehicleSlug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const color = accent ?? "#0f766e";

  if (disabled) {
    return (
      <FeedbackBanner variant="info">
        {disabledMessage ?? "Contactul online nu este disponibil momentan pentru acest dealer."}
      </FeedbackBanner>
    );
  }

  if (state?.success) {
    return (
      <FeedbackBanner variant="success">
        Mesajul a fost înregistrat. Te vom contacta în curând.
      </FeedbackBanner>
    );
  }

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nume</Label>
        <Input id="name" name="name" required disabled={pending} autoComplete="name" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email (opțional)</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            disabled={pending}
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Telefon (opțional)</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            disabled={pending}
            autoComplete="tel"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">Mesaj (opțional)</Label>
        <textarea
          id="message"
          name="message"
          rows={4}
          disabled={pending}
          className="min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-50"
        />
      </div>

      {/* Honeypot — hidden from users */}
      <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}

      <Button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto"
        style={{ backgroundColor: color }}
      >
        {pending ? "Se trimite…" : "Sunt interesat"}
      </Button>
    </form>
  );
}
