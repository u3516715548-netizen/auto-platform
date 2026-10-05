import { createVehicleInputSchema, type CreateVehicleInput } from "@auto-platform/types";

export type ParseCreateVehicleResult =
  | { ok: true; data: CreateVehicleInput }
  | { ok: false; error: string };

/**
 * Parses create-vehicle FormData. Ignores / rejects client tenant_id.
 */
export function parseCreateVehicleForm(formData: FormData): ParseCreateVehicleResult {
  // Explicitly ignore any client-supplied tenant identifiers.
  const raw = {
    make: formData.get("make"),
    model: formData.get("model"),
    year: formData.get("year"),
    mileage: formData.get("mileage"),
    price: formData.get("price"),
    currency: formData.get("currency") || "EUR",
    slug: formData.get("slug") || undefined,
  };

  const parsed = createVehicleInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Date invalide pentru vehicul." };
  }

  const slug =
    typeof parsed.data.slug === "string" && parsed.data.slug.length > 0
      ? parsed.data.slug
      : undefined;

  return {
    ok: true,
    data: {
      ...parsed.data,
      slug,
    },
  };
}

/** True if the form attempted to smuggle a tenant id (must never be used). */
export function formAttemptsTenantId(formData: FormData): boolean {
  return (
    formData.has("tenant_id") ||
    formData.has("tenantId") ||
    formData.has("tenant") ||
    Boolean(formData.get("tenant_id") || formData.get("tenantId"))
  );
}
