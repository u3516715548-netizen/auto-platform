"use client";

import { useActionState } from "react";
import { Button } from "@auto-platform/ui";
import {
  cancelReservationFormAction,
  type CancelReservationFormState,
} from "@/lib/reservations/cancel-reservation-form-action";
import {
  convertReservationFormAction,
  type ConvertReservationFormState,
} from "@/lib/reservations/convert-reservation-form-action";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const cancelInitial: CancelReservationFormState = { error: null };
const convertInitial: ConvertReservationFormState = { error: null };

type ReservationActionsProps = {
  reservationId: string;
};

export function ReservationActions({ reservationId }: ReservationActionsProps) {
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelReservationFormAction,
    cancelInitial,
  );
  const [convertState, convertAction, convertPending] = useActionState(
    convertReservationFormAction,
    convertInitial,
  );

  const busy = cancelPending || convertPending;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {cancelState?.error ? (
        <FeedbackBanner variant="error">{cancelState.error}</FeedbackBanner>
      ) : null}
      {convertState?.error ? (
        <FeedbackBanner variant="error">{convertState.error}</FeedbackBanner>
      ) : null}

      <form action={cancelAction} className="flex min-w-0 flex-col gap-2">
        <input type="hidden" name="reservationId" value={reservationId} />
        <p className="text-sm leading-6 text-zinc-600">
          Anularea eliberează vehiculul dacă este încă rezervat. Acțiunea nu poate fi anulată din
          această pagină.
        </p>
        <Button type="submit" variant="secondary" disabled={busy} className="w-full sm:w-auto">
          {cancelPending ? "Se anulează…" : "Anulează rezervarea"}
        </Button>
      </form>

      <form action={convertAction} className="flex min-w-0 flex-col gap-2 border-t border-zinc-200 pt-4">
        <input type="hidden" name="reservationId" value={reservationId} />
        <p className="text-sm leading-6 text-zinc-600">
          Această acțiune va marca vehiculul ca vândut și nu poate fi anulată din această pagină.
        </p>
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {convertPending ? "Se convertește…" : "Marchează ca vândută"}
        </Button>
      </form>
    </div>
  );
}
