import {
  cancelReservationInputSchema,
  convertReservationInputSchema,
  createReservationInputSchema,
  reservationIdSchema,
  vehicleIdSchema,
  type CancelReservationInput,
  type ConvertReservationInput,
  type CreateReservationInput,
} from "@auto-platform/types";

export function rejectTenantIdFromReservationForm(formData: FormData): string | null {
  if (formData.has("tenantId") || formData.has("tenant_id")) {
    return "Date invalide pentru rezervare.";
  }
  return null;
}

export function parseReservationId(raw: string): { ok: true; id: string } | { ok: false } {
  const parsed = reservationIdSchema.safeParse(raw);
  return parsed.success ? { ok: true, id: parsed.data } : { ok: false };
}

export function parseCreateReservationForm(
  formData: FormData,
): { ok: true; data: CreateReservationInput } | { ok: false; error: string } {
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const idempotencyRaw = formData.get("idempotencyKey");
  const idempotencyKey =
    typeof idempotencyRaw === "string" && idempotencyRaw.trim()
      ? idempotencyRaw.trim()
      : undefined;

  const vehicleParsed = vehicleIdSchema.safeParse(vehicleId);
  if (!vehicleParsed.success) {
    return { ok: false, error: "Vehicul invalid." };
  }

  const parsed = createReservationInputSchema.safeParse({
    vehicleId: vehicleParsed.data,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });
  if (!parsed.success) {
    return { ok: false, error: "Date invalide pentru rezervare." };
  }
  return { ok: true, data: parsed.data };
}

export function parseCancelReservationForm(
  formData: FormData,
): { ok: true; data: CancelReservationInput } | { ok: false; error: string } {
  const parsed = cancelReservationInputSchema.safeParse({
    reservationId: String(formData.get("reservationId") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Rezervare invalidă." };
  }
  return { ok: true, data: parsed.data };
}

export function parseConvertReservationForm(
  formData: FormData,
): { ok: true; data: ConvertReservationInput } | { ok: false; error: string } {
  const parsed = convertReservationInputSchema.safeParse({
    reservationId: String(formData.get("reservationId") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Rezervare invalidă." };
  }
  return { ok: true, data: parsed.data };
}
