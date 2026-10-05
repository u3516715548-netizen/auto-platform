import { createPublicLeadInputSchema } from "@auto-platform/types";
import { tenantSlugSchema } from "@auto-platform/types";

export type ParsePublicLeadResult =
  | {
      ok: true;
      data: {
        name: string;
        email?: string;
        phone?: string;
        message?: string;
      }; // email lowercased; phone E.164 when present
      honeypotTriggered: boolean;
    }
  | { ok: false; error: string };

/**
 * Parses public lead FormData. Ignores/rejects client tenant_id and vehicle_id.
 */
export function parsePublicLeadForm(formData: FormData): ParsePublicLeadResult {
  if (formAttemptsTenantOrVehicleId(formData)) {
    return { ok: false, error: "Cerere invalidă." };
  }

  const honeypot = String(formData.get("company") ?? "").trim();
  const honeypotTriggered = honeypot.length > 0;

  if (honeypotTriggered) {
    return {
      ok: true,
      honeypotTriggered: true,
      data: {
        name: String(formData.get("name") ?? "").trim() || "—",
      },
    };
  }

  const parsed = createPublicLeadInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    message: formData.get("message") ?? undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Date invalide." };
  }

  return {
    ok: true,
    honeypotTriggered,
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message,
    },
  };
}

export function formAttemptsTenantOrVehicleId(formData: FormData): boolean {
  return (
    formData.has("tenant_id") ||
    formData.has("tenantId") ||
    formData.has("tenant") ||
    formData.has("vehicle_id") ||
    formData.has("vehicleId") ||
    Boolean(
      formData.get("tenant_id") ||
        formData.get("tenantId") ||
        formData.get("vehicle_id") ||
        formData.get("vehicleId"),
    )
  );
}

export function parseVehicleSlugParam(raw: string): string | null {
  const parsed = tenantSlugSchema.safeParse(raw);
  // vehicle slug uses same shape constraints as tenant slug (kebab)
  if (!parsed.success) {
    // allow slightly looser: reuse regex from create vehicle
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw) && raw.length >= 1 && raw.length <= 80) {
      return raw;
    }
    return null;
  }
  return parsed.data;
}
