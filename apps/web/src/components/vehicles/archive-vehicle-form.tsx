"use client";

import { useActionState } from "react";
import { Button } from "@auto-platform/ui";
import {
  archiveVehicleAction,
  type ArchiveVehicleState,
} from "@/lib/vehicles/archive-vehicle";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const initialState: ArchiveVehicleState = { error: null };

type ArchiveVehicleFormProps = {
  vehicleId: string;
  alreadyArchived: boolean;
};

export function ArchiveVehicleForm({ vehicleId, alreadyArchived }: ArchiveVehicleFormProps) {
  const [state, formAction, pending] = useActionState(archiveVehicleAction, initialState);

  if (alreadyArchived) {
    return (
      <FeedbackBanner variant="info">
        Vehiculul este arhivat. Poți schimba statusul mai sus pentru a-l reactiva în stocul activ.
      </FeedbackBanner>
    );
  }

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <p className="text-sm leading-6 text-zinc-700">
        Arhivarea este logică: vehiculul dispare din stocul activ, dar nu este șters fizic.
      </p>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-800">
        <input
          type="checkbox"
          name="confirmArchive"
          value="yes"
          disabled={pending}
          className="mt-1 h-4 w-4 shrink-0 accent-teal-800"
          required
        />
        <span>
          <span className="font-medium text-zinc-900">Confirm arhivarea acestui vehicul</span>
          <span className="mt-1 block text-xs leading-5 text-zinc-600">
            Acțiunea este auditată și poate fi anulată prin schimbarea statusului.
          </span>
        </span>
      </label>

      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}

      <Button type="submit" variant="secondary" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Se arhivează…" : "Arhivează vehicul"}
      </Button>
    </form>
  );
}
