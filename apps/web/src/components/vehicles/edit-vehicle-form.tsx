"use client";

import { useActionState, type ReactNode } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import {
  updateVehicleAction,
  type UpdateVehicleState,
} from "@/lib/vehicles/update-vehicle";
import type { TenantVehicle } from "@/lib/vehicles/get-vehicle";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { nativeSelectClassName } from "@/lib/ui/form-styles";
import {
  VEHICLE_ACCIDENT_STATUS_LABELS_RO,
  VEHICLE_BODY_TYPE_LABELS_RO,
  VEHICLE_CONDITION_LABELS_RO,
  VEHICLE_DRIVE_TYPE_LABELS_RO,
  VEHICLE_EMISSION_LABELS_RO,
  VEHICLE_FUEL_LABELS_RO,
  VEHICLE_TRANSMISSION_LABELS_RO,
  VEHICLE_VAT_REGIME_LABELS_RO,
  enumOptions,
  featureOptions,
} from "@/lib/vehicles/vehicle-field-labels";

const initialState: UpdateVehicleState = { error: null };

type EditVehicleFormProps = {
  vehicle: TenantVehicle;
  readOnly?: boolean;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 border-t border-zinc-200 pt-4 first:border-t-0 first:pt-0">
      <h4 className="text-sm font-semibold tracking-tight text-zinc-900">{title}</h4>
      {children}
    </section>
  );
}

function SelectField({
  id,
  name,
  label,
  disabled,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  label: string;
  disabled: boolean;
  defaultValue: string | null | undefined;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        disabled={disabled}
        defaultValue={defaultValue ?? ""}
        className={nativeSelectClassName}
      >
        <option value="">— Selectează —</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function EditVehicleForm({ vehicle, readOnly = false }: EditVehicleFormProps) {
  const [state, formAction, pending] = useActionState(updateVehicleAction, initialState);
  const disabled = readOnly || pending;
  const selectedFeatures = new Set(vehicle.features);

  return (
    <form action={formAction} className="flex w-full min-w-0 flex-col gap-5">
      <input type="hidden" name="vehicleId" value={vehicle.id} />

      <Section title="Date de bază">
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
            <Label htmlFor="year">An model</Label>
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
            <Label htmlFor="mileage">Kilometraj (km)</Label>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vin">VIN (doar staff)</Label>
            <Input
              id="vin"
              name="vin"
              disabled={disabled}
              defaultValue={vehicle.vin ?? ""}
              autoComplete="off"
              placeholder="Opțional"
            />
            <p className="text-xs leading-5 text-zinc-500">
              Nu este afișat pe storefront sau în lista publică.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Tehnic">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="fuel"
            name="fuel"
            label="Combustibil"
            disabled={disabled}
            defaultValue={vehicle.fuel}
            options={enumOptions(VEHICLE_FUEL_LABELS_RO)}
          />
          <SelectField
            id="transmission"
            name="transmission"
            label="Transmisie"
            disabled={disabled}
            defaultValue={vehicle.transmission}
            options={enumOptions(VEHICLE_TRANSMISSION_LABELS_RO)}
          />
          <SelectField
            id="bodyType"
            name="bodyType"
            label="Caroserie"
            disabled={disabled}
            defaultValue={vehicle.bodyType}
            options={enumOptions(VEHICLE_BODY_TYPE_LABELS_RO)}
          />
          <SelectField
            id="driveType"
            name="driveType"
            label="Tracțiune"
            disabled={disabled}
            defaultValue={vehicle.driveType}
            options={enumOptions(VEHICLE_DRIVE_TYPE_LABELS_RO)}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="powerHp">Putere (CP)</Label>
            <Input
              id="powerHp"
              name="powerHp"
              type="number"
              inputMode="numeric"
              min={1}
              disabled={disabled}
              defaultValue={vehicle.powerHp ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="engineDisplacementCc">Cilindree (cm³)</Label>
            <Input
              id="engineDisplacementCc"
              name="engineDisplacementCc"
              type="number"
              inputMode="numeric"
              min={1}
              disabled={disabled}
              defaultValue={vehicle.engineDisplacementCc ?? ""}
            />
          </div>
          <SelectField
            id="emissionStandard"
            name="emissionStandard"
            label="Normă poluare"
            disabled={disabled}
            defaultValue={vehicle.emissionStandard}
            options={enumOptions(VEHICLE_EMISSION_LABELS_RO)}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doors">Uși</Label>
              <Input
                id="doors"
                name="doors"
                type="number"
                inputMode="numeric"
                min={1}
                disabled={disabled}
                defaultValue={vehicle.doors ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seats">Locuri</Label>
              <Input
                id="seats"
                name="seats"
                type="number"
                inputMode="numeric"
                min={1}
                disabled={disabled}
                defaultValue={vehicle.seats ?? ""}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exteriorColor">Culoare exterior</Label>
            <Input
              id="exteriorColor"
              name="exteriorColor"
              disabled={disabled}
              defaultValue={vehicle.exteriorColor ?? ""}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interiorColor">Culoare interior</Label>
            <Input
              id="interiorColor"
              name="interiorColor"
              disabled={disabled}
              defaultValue={vehicle.interiorColor ?? ""}
              autoComplete="off"
            />
          </div>
        </div>
      </Section>

      <Section title="Preț și fiscal">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">Preț (EUR)</Label>
            <Input
              id="price"
              name="price"
              inputMode="decimal"
              required
              disabled={disabled}
              defaultValue={vehicle.price}
            />
            <p className="text-xs leading-5 text-zinc-500">Moneda este fixă: euro (€).</p>
          </div>
          <SelectField
            id="vatRegime"
            name="vatRegime"
            label="Regim TVA"
            disabled={disabled}
            defaultValue={vehicle.vatRegime}
            options={enumOptions(VEHICLE_VAT_REGIME_LABELS_RO)}
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            name="priceNegotiable"
            value="true"
            disabled={disabled}
            defaultChecked={vehicle.priceNegotiable}
            className="size-4 rounded border-zinc-300"
          />
          Preț negociabil
        </label>
      </Section>

      <Section title="Stare și istoric">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="condition"
            name="condition"
            label="Stare"
            disabled={disabled}
            defaultValue={vehicle.condition}
            options={enumOptions(VEHICLE_CONDITION_LABELS_RO)}
          />
          <SelectField
            id="accidentStatus"
            name="accidentStatus"
            label="Daune / accidente"
            disabled={disabled}
            defaultValue={vehicle.accidentStatus}
            options={enumOptions(VEHICLE_ACCIDENT_STATUS_LABELS_RO)}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstRegistrationYear">An prima înmatriculare</Label>
            <Input
              id="firstRegistrationYear"
              name="firstRegistrationYear"
              type="number"
              inputMode="numeric"
              min={1950}
              max={2100}
              disabled={disabled}
              defaultValue={vehicle.firstRegistrationYear ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstRegistrationMonth">Luna primei înmatriculări</Label>
            <Input
              id="firstRegistrationMonth"
              name="firstRegistrationMonth"
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              disabled={disabled}
              defaultValue={vehicle.firstRegistrationMonth ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="originCountry">Țară origine (ISO)</Label>
            <Input
              id="originCountry"
              name="originCountry"
              disabled={disabled}
              defaultValue={vehicle.originCountry ?? ""}
              placeholder="RO"
              maxLength={2}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="locationCity">Locație / oraș</Label>
            <Input
              id="locationCity"
              name="locationCity"
              disabled={disabled}
              defaultValue={vehicle.locationCity ?? ""}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warrantyMonths">Garanție (luni)</Label>
            <Input
              id="warrantyMonths"
              name="warrantyMonths"
              type="number"
              inputMode="numeric"
              min={0}
              disabled={disabled}
              defaultValue={vehicle.warrantyMonths ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warrantyNotes">Note garanție</Label>
            <Input
              id="warrantyNotes"
              name="warrantyNotes"
              disabled={disabled}
              defaultValue={vehicle.warrantyNotes ?? ""}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              name="hasServiceBook"
              value="true"
              disabled={disabled}
              defaultChecked={vehicle.hasServiceBook}
              className="size-4 rounded border-zinc-300"
            />
            Carte de service
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              name="hasServiceHistory"
              value="true"
              disabled={disabled}
              defaultChecked={vehicle.hasServiceHistory}
              className="size-4 rounded border-zinc-300"
            />
            Istoric service disponibil
          </label>
        </div>
      </Section>

      <Section title="Descriere">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Descriere publică</Label>
          <textarea
            id="description"
            name="description"
            rows={5}
            disabled={disabled}
            defaultValue={vehicle.description ?? ""}
            className="min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-50"
            placeholder="Text simplu, fără HTML. Obligatorie înainte de publicare."
          />
        </div>
      </Section>

      <Section title="Dotări">
        <ul className="grid gap-2 sm:grid-cols-2">
          {featureOptions().map((feature) => (
            <li key={feature.key}>
              <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  name="features"
                  value={feature.key}
                  disabled={disabled}
                  defaultChecked={selectedFeatures.has(feature.key)}
                  className="size-4 rounded border-zinc-300"
                />
                {feature.label}
              </label>
            </li>
          ))}
        </ul>
      </Section>

      {state?.error ? <FeedbackBanner variant="error">{state.error}</FeedbackBanner> : null}

      {!readOnly ? (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Se salvează…" : "Salvează modificările"}
        </Button>
      ) : null}
    </form>
  );
}
