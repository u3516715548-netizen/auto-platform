import {
  updateVehicleInputSchema,
  updateVehicleStatusSchema,
  vehicleFeaturesSchema,
  vehicleIdSchema,
  type UpdateVehicleInput,
  type UpdateVehicleStatusInput,
} from "@auto-platform/types";
import { formAttemptsTenantId } from "./parse-create-form";

export type ParseUpdateVehicleResult =
  | { ok: true; data: UpdateVehicleInput }
  | { ok: false; error: string };

export type ParseStatusResult =
  | { ok: true; data: UpdateVehicleStatusInput }
  | { ok: false; error: string };

export type ParseVehicleIdResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function checkboxOn(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

function parseFeatures(formData: FormData) {
  const raw = formData
    .getAll("features")
    .filter((entry): entry is string => typeof entry === "string");
  return vehicleFeaturesSchema.safeParse(raw);
}

export function parseVehicleId(raw: FormDataEntryValue | null): ParseVehicleIdResult {
  const parsed = vehicleIdSchema.safeParse(typeof raw === "string" ? raw : "");
  if (!parsed.success) {
    return { ok: false, error: "ID vehicul invalid." };
  }
  return { ok: true, id: parsed.data };
}

/**
 * Parses full edit FormData (Etapa 6B).
 * Forces EUR; rejects unknown feature keys; ignores client tenant_id (caller checks).
 */
export function parseUpdateVehicleForm(formData: FormData): ParseUpdateVehicleResult {
  const featuresParsed = parseFeatures(formData);
  if (!featuresParsed.success) {
    return { ok: false, error: "Dotările conțin valori nepermise." };
  }

  // Client currency is ignored — always EUR server-side.
  const raw = {
    make: formData.get("make"),
    model: formData.get("model"),
    year: formData.get("year"),
    mileage: formData.get("mileage"),
    price: formData.get("price"),
    currency: "EUR",
    slug: formData.get("slug"),
    vin: formData.get("vin"),
    fuel: formData.get("fuel"),
    transmission: formData.get("transmission"),
    bodyType: formData.get("bodyType"),
    driveType: formData.get("driveType"),
    condition: formData.get("condition"),
    emissionStandard: formData.get("emissionStandard"),
    vatRegime: formData.get("vatRegime"),
    accidentStatus: formData.get("accidentStatus"),
    powerHp: formData.get("powerHp"),
    engineDisplacementCc: formData.get("engineDisplacementCc"),
    doors: formData.get("doors"),
    seats: formData.get("seats"),
    exteriorColor: formData.get("exteriorColor"),
    interiorColor: formData.get("interiorColor"),
    firstRegistrationYear: formData.get("firstRegistrationYear"),
    firstRegistrationMonth: formData.get("firstRegistrationMonth"),
    priceNegotiable: checkboxOn(formData, "priceNegotiable"),
    originCountry: formData.get("originCountry"),
    locationCity: formData.get("locationCity"),
    warrantyMonths: formData.get("warrantyMonths"),
    warrantyNotes: formData.get("warrantyNotes"),
    hasServiceBook: checkboxOn(formData, "hasServiceBook"),
    hasServiceHistory: checkboxOn(formData, "hasServiceHistory"),
    description: formData.get("description"),
    features: featuresParsed.data,
  };

  const parsed = updateVehicleInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Date invalide pentru vehicul." };
  }

  return { ok: true, data: { ...parsed.data, currency: "EUR" } };
}

export function parseUpdateStatusForm(formData: FormData): ParseStatusResult {
  const parsed = updateVehicleStatusSchema.safeParse({
    status: formData.get("status"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Status invalid." };
  }
  return { ok: true, data: parsed.data };
}

export function rejectTenantIdFromForm(formData: FormData): string | null {
  if (formAttemptsTenantId(formData)) {
    return "Cerere invalidă: tenantul nu poate fi trimis din client.";
  }
  return null;
}
