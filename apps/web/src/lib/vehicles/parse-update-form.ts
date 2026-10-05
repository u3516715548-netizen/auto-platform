import {
  updateVehicleInputSchema,
  updateVehicleStatusSchema,
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

export function parseVehicleId(raw: FormDataEntryValue | null): ParseVehicleIdResult {
  const parsed = vehicleIdSchema.safeParse(typeof raw === "string" ? raw : "");
  if (!parsed.success) {
    return { ok: false, error: "ID vehicul invalid." };
  }
  return { ok: true, id: parsed.data };
}

export function parseUpdateVehicleForm(formData: FormData): ParseUpdateVehicleResult {
  const raw = {
    make: formData.get("make"),
    model: formData.get("model"),
    year: formData.get("year"),
    mileage: formData.get("mileage"),
    price: formData.get("price"),
    currency: formData.get("currency") || "EUR",
    slug: formData.get("slug"),
  };

  const parsed = updateVehicleInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Date invalide pentru vehicul." };
  }

  return { ok: true, data: parsed.data };
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
