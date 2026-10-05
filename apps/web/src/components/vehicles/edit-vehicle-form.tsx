"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import {
  updateVehicleAction,
  type UpdateVehicleState,
} from "@/lib/vehicles/update-vehicle";
import type { TenantVehicle } from "@/lib/vehicles/get-vehicle";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { nativeSelectClassName } from "@/lib/ui/form-styles";

const initialState: UpdateVehicleState = { error: null };

type EditVehicleFormProps = {
  vehicle: TenantVehicle;
  readOnly?: boolean;
};

export function EditVehicleForm({ vehicle, readOnly = false }: EditVehicleFormProps) {
  const [state, formAction, pending] = useActionState(updateVehicleAction, initialState);
  const disabled = readOnly || pending;

  return (
    <form action={formAction} className="flex w-full min-w-0 flex-col gap-4">
      <input type="hidden" name="vehicleId" value={vehicle.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="make">Marcă</Label>
          <Input
            id="make"
            name="make"
            required
            disabled={disabled}
            defaultValue={vehicle.make}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            name="model"
            required
            disabled={disabled}
            defaultValue={vehicle.model}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="year">An</Label>
          <Input
            id="year"
            name="year"
            type="number"
            inputMode="numeric"
            required
            min={1950}
            max={2100}
            disabled={disabled}
            defaultValue={vehicle.year}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mileage">Kilometraj</Label>
          <Input
            id="mileage"
            name="mileage"
            type="number"
            inputMode="numeric"
            required
            min={0}
            disabled={disabled}
            defaultValue={vehicle.mileage}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Preț</Label>
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            required
            disabled={disabled}
            defaultValue={vehicle.price}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">Monedă</Label>
          <select
            id="currency"
            name="currency"
            disabled={disabled}
            defaultValue={vehicle.currency}
            className={nativeSelectClassName}
          >
            <option value="EUR">EUR</option>
            <option value="RON">RON</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          required
          disabled={disabled}
          defaultValue={vehicle.slug}
          autoComplete="off"
        />
      </div>

      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}

      {!readOnly ? (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Se salvează…" : "Salvează modificările"}
        </Button>
      ) : null}
    </form>
  );
}
