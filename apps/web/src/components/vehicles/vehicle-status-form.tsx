"use client";

import { useActionState } from "react";
import { Button, Label } from "@auto-platform/ui";
import type { VehicleStatus } from "@auto-platform/types";
import {
  updateVehicleStatusAction,
  type UpdateVehicleStatusState,
} from "@/lib/vehicles/update-vehicle-status";
import { vehicleStatusLabel } from "@/lib/vehicles/status-label";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { nativeSelectClassName } from "@/lib/ui/form-styles";

const initialState: UpdateVehicleStatusState = { error: null };

const STATUSES: VehicleStatus[] = [
  "draft",
  "available",
  "reserved",
  "sold",
  "archived",
];

type VehicleStatusFormProps = {
  vehicleId: string;
  currentStatus: VehicleStatus;
  readOnly?: boolean;
};

export function VehicleStatusForm({
  vehicleId,
  currentStatus,
  readOnly = false,
}: VehicleStatusFormProps) {
  const [state, formAction, pending] = useActionState(updateVehicleStatusAction, initialState);

  if (readOnly) {
    return (
      <p className="rounded-md bg-zinc-100 px-3 py-2.5 text-sm text-zinc-800">
        Status: <span className="font-medium">{vehicleStatusLabel(currentStatus)}</span>
      </p>
    );
  }

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={currentStatus}
          disabled={pending}
          className={nativeSelectClassName}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {vehicleStatusLabel(status)}
            </option>
          ))}
        </select>
        {currentStatus === "archived" ? (
          <p className="text-xs leading-5 text-zinc-600">
            Pentru reactivare, alege un status diferit de „Arhivat” (ex. Ciornă sau Disponibil).
          </p>
        ) : null}
      </div>

      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}

      <Button type="submit" variant="secondary" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Se actualizează…" : "Actualizează status"}
      </Button>
    </form>
  );
}
