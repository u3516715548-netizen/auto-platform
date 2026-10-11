"use client";

import { useActionState } from "react";
import { useState } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import {
  startSelfServeCheckoutAction,
  type StartCheckoutState,
} from "@/lib/billing/start-checkout";
import type { SelfServePlanCode } from "@/lib/billing/plan-codes";
import { getCommercialPlan } from "@/lib/marketing/commercial-plans";

type CheckoutFormProps = {
  plan: SelfServePlanCode;
  canceled?: boolean;
};

export function CheckoutForm({ plan, canceled }: CheckoutFormProps) {
  const commercial = getCommercialPlan(plan);
  const [state, formAction, pending] = useActionState<StartCheckoutState | null, FormData>(
    startSelfServeCheckoutAction,
    null,
  );
  const [slug, setSlug] = useState("");

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="plan" value={plan} />

      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">
          Plan {commercial.name} — {commercial.priceLabel}
        </p>
        <p className="mt-1 text-zinc-600">{commercial.blurb}</p>
      </div>

      {canceled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Plata a fost anulată. Poți reîncerca mai jos.
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nume showroom / firmă</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          disabled={pending}
          placeholder="Ex. Auto Premium București"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Subdomeniu storefront</Label>
        <Input
          id="slug"
          name="slug"
          required
          minLength={2}
          maxLength={48}
          pattern="[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?"
          disabled={pending}
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          placeholder="ex. auto-premium"
        />
        <p className="text-xs text-zinc-500">
          Storefront:{" "}
          <span className="font-mono">
            {slug || "slug"}.{(typeof window !== "undefined"
              ? window.location.host.replace(/^[^.]+\./, "")
              : "localhost:3000")}
          </span>
        </p>
      </div>

      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Se pregătește plata…" : "Continuă la plată"}
      </Button>
    </form>
  );
}
