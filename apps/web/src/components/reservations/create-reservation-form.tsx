"use client";

import { useActionState } from "react";
import { Button } from "@auto-platform/ui";
import {
  createReservationFormAction,
  type CreateReservationFormState,
} from "@/lib/reservations/create-reservation-form-action";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const initialState: CreateReservationFormState = { error: null };

type CreateReservationFormProps = {
  vehicleId: string;
  /** Server-generated UUID bound to this form render (idempotent double-submit). */
  idempotencyKey: string;
};

export function CreateReservationForm({
  vehicleId,
  idempotencyKey,
}: CreateReservationFormProps) {
  const [state, formAction, pending] = useActionState(createReservationFormAction, initialState);

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <p className="text-sm leading-6 text-zinc-600">
        Vehiculul va fi rezervat pentru <span className="font-medium text-zinc-900">48 de ore</span>.
        În acest interval, mașina nu mai apare în catalogul public.
      </p>
      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Se creează…" : "Creează rezervare"}
      </Button>
    </form>
  );
}
