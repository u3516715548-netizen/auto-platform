"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@auto-platform/ui";
import { vehiclesPath } from "@/lib/dashboard/nav";
import {
  createVehicleAction,
  type CreateVehicleState,
} from "@/lib/vehicles/create-vehicle";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const initialState: CreateVehicleState = { error: null };

export function CreateVehicleForm() {
  const [state, formAction, pending] = useActionState(createVehicleAction, initialState);

  return (
    <form action={formAction} className="flex w-full min-w-0 flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="make">Marcă</Label>
          <Input
            id="make"
            name="make"
            required
            disabled={pending}
            placeholder="Volkswagen"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            name="model"
            required
            disabled={pending}
            placeholder="Golf"
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
            disabled={pending}
            placeholder="2022"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mileage">Kilometraj (km)</Label>
          <Input
            id="mileage"
            name="mileage"
            type="number"
            inputMode="numeric"
            required
            min={0}
            disabled={pending}
            placeholder="25000"
            defaultValue={0}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="price">Preț (EUR)</Label>
        <Input
          id="price"
          name="price"
          inputMode="decimal"
          required
          disabled={pending}
          placeholder="18990"
        />
        <p className="text-xs leading-5 text-zinc-500">
          Se creează ca ciornă. Moneda este fixă: euro (€). Completezi detaliile tehnice la editare.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Slug (opțional)</Label>
        <Input
          id="slug"
          name="slug"
          disabled={pending}
          placeholder="golf-8-2022"
          autoComplete="off"
        />
        <p className="text-xs leading-5 text-zinc-500">
          Dacă lași gol, generăm automat din marcă, model și an.
        </p>
      </div>

      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Se salvează…" : "Salvează ciorna"}
        </Button>
        <Link
          href={vehiclesPath()}
          className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          Anulează
        </Link>
      </div>
    </form>
  );
}
