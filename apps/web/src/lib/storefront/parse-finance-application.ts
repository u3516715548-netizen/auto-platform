import { createFinanceApplicationInputSchema } from "@auto-platform/types";
import { formAttemptsTenantOrVehicleId, parseVehicleSlugParam } from "@/lib/storefront/parse-public-lead";

export type ParseFinanceApplicationResult =
  | {
      ok: true;
      data: {
        applicantType: "individual" | "company";
        fullName: string;
        companyTaxId?: string;
        email: string;
        phone: string;
        amountEur: number;
        termMonths: 12 | 24 | 36 | 48 | 60;
        consent: true;
      };
      honeypotTriggered: boolean;
    }
  | { ok: false; error: string };

/** Checkbox FormData: "on" / "true" / "1" → true. */
function parseConsentCheckbox(raw: FormDataEntryValue | null): boolean {
  if (raw === null || raw === undefined) return false;
  const value = String(raw).trim().toLowerCase();
  return value === "on" || value === "true" || value === "1";
}

/**
 * Parses finance FormData. Honeypot field is `website` (not company name).
 * Ignores client tenant_id / vehicle_id / lead_id.
 */
export function parseFinanceApplicationForm(formData: FormData): ParseFinanceApplicationResult {
  if (formAttemptsTenantOrVehicleId(formData)) {
    return { ok: false, error: "Cerere invalidă." };
  }
  if (
    formData.has("lead_id") ||
    formData.has("leadId") ||
    Boolean(formData.get("lead_id") || formData.get("leadId"))
  ) {
    return { ok: false, error: "Cerere invalidă." };
  }

  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot.length > 0) {
    return {
      ok: true,
      honeypotTriggered: true,
      data: {
        applicantType: "individual",
        fullName: "—",
        email: "honeypot@invalid.local",
        phone: "+40000000000",
        amountEur: 1,
        termMonths: 12,
        consent: true,
      },
    };
  }

  const consent = parseConsentCheckbox(formData.get("consent"));
  const parsed = createFinanceApplicationInputSchema.safeParse({
    applicantType: formData.get("applicantType") ?? undefined,
    firstName: formData.get("firstName") ?? undefined,
    lastName: formData.get("lastName") ?? undefined,
    companyName: formData.get("companyName") ?? undefined,
    companyTaxId: formData.get("companyTaxId") ?? undefined,
    email: formData.get("email") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    amountEur: formData.get("amountEur") ?? undefined,
    termMonths: formData.get("termMonths") ?? undefined,
    consent: consent ? true : false,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Date invalide." };
  }

  return {
    ok: true,
    honeypotTriggered: false,
    data: parsed.data,
  };
}

export { parseVehicleSlugParam };
