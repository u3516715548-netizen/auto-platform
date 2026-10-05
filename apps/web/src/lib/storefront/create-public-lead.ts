"use server";

import { cookies } from "next/headers";
import { getDb, leads } from "@auto-platform/db";
import { clearPublicSessionGucs } from "@/lib/storefront/clear-public-session";
import {
  buildLeadCooldownCookieName,
  isLeadCooldownActive,
  leadCooldownMs,
  normalizeLeadEmail,
} from "@/lib/storefront/lead-cooldown";
import { parsePublicLeadForm, parseVehicleSlugParam } from "@/lib/storefront/parse-public-lead";
import { resolvePublicTenantFromHost } from "@/lib/storefront/resolve-public-tenant";
import { getPublicVehicleIdForLead } from "@/lib/storefront/public-vehicles";

export type CreatePublicLeadState = {
  error: string | null;
  success: boolean;
};

const NEUTRAL_COOLDOWN = "Cererea a fost deja înregistrată. Poți încerca din nou mai târziu.";
const NEUTRAL_TRIAL = "Contactul online nu este disponibil momentan pentru acest dealer.";
const NEUTRAL_ERROR = "Nu am putut trimite mesajul. Verifică datele și încearcă din nou.";

/**
 * Creates a storefront lead for the Host tenant + page vehicle slug.
 * Ignores any client-supplied tenant_id / vehicle_id.
 */
export async function createPublicLeadAction(
  vehicleSlugRaw: string,
  _prev: CreatePublicLeadState | null,
  formData: FormData,
): Promise<CreatePublicLeadState> {
  const slug = parseVehicleSlugParam(vehicleSlugRaw);
  if (!slug) {
    return { error: NEUTRAL_ERROR, success: false };
  }

  const resolved = await resolvePublicTenantFromHost();
  if (resolved.kind !== "ok") {
    return { error: NEUTRAL_ERROR, success: false };
  }

  const { tenant } = resolved;
  if (tenant.status !== "active") {
    return { error: NEUTRAL_TRIAL, success: false };
  }

  const parsed = parsePublicLeadForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error, success: false };
  }

  // Honeypot: pretend success, do not insert.
  if (parsed.honeypotTriggered) {
    return { error: null, success: true };
  }

  const emailNormalized = normalizeLeadEmail(parsed.data.email);
  const cookieName = buildLeadCooldownCookieName(slug, emailNormalized);
  const cookieStore = await cookies();
  if (isLeadCooldownActive(cookieStore.get(cookieName)?.value)) {
    return { error: NEUTRAL_COOLDOWN, success: false };
  }

  const vehicleId = await getPublicVehicleIdForLead(tenant.tenantId, slug);
  if (!vehicleId) {
    return { error: NEUTRAL_ERROR, success: false };
  }

  try {
    const db = getDb();
    await clearPublicSessionGucs(db);

    await db.insert(leads).values({
      tenantId: tenant.tenantId,
      vehicleId,
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      message: parsed.data.message ?? null,
      source: "storefront",
      status: "new",
      assignedTo: null,
    });

    cookieStore.set(cookieName, String(Date.now()), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.ceil(leadCooldownMs() / 1000),
    });
  } catch {
    return { error: NEUTRAL_ERROR, success: false };
  }

  return { error: null, success: true };
}
