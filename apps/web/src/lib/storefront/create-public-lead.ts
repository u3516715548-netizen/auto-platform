"use server";

import { cookies, headers } from "next/headers";
import { getDb, leads } from "@auto-platform/db";
import { hasRecentLeadForContact } from "@/lib/leads/lead-contact-dedup";
import { buildLeadContactKey } from "@/lib/leads/lead-contact";
import { loadLeadNotificationEmailsForTenant } from "@/lib/leads/load-notification-emails";
import {
  getPublicLeadRateLimitBackend,
  PUBLIC_LEAD_RATE_LIMIT_ENDPOINT,
} from "@/lib/leads/public-lead-rate-limit";
import {
  getTrustedClientIp,
  hashClientIpForRateLimit,
} from "@/lib/leads/trusted-client-ip";
import { maybeNotifyAfterPublicLeadInsert } from "@/lib/notifications/lead-email";
import { clearPublicSessionGucs } from "@/lib/storefront/clear-public-session";
import {
  buildLeadCooldownCookieName,
  isLeadCooldownActive,
  leadCooldownMs,
} from "@/lib/storefront/lead-cooldown";
import { parsePublicLeadForm, parseVehicleSlugParam } from "@/lib/storefront/parse-public-lead";
import { resolvePublicTenantFromHost } from "@/lib/storefront/resolve-public-tenant";
import { getPublicVehicleIdForLead } from "@/lib/storefront/public-vehicles";
import { getRootDomain } from "@/lib/supabase/env";
import { isVercelDemoPublicLeadsDisabledFromRequest } from "@/lib/tenant/vercel-demo-only";

export type CreatePublicLeadState = {
  error: string | null;
  success: boolean;
  /** Server Actions cannot set HTTP 429; mirrors Retry-After when rate limited. */
  rateLimited?: boolean;
  retryAfterSeconds?: number;
};

const NEUTRAL_COOLDOWN = "Cererea a fost deja înregistrată. Poți încerca din nou mai târziu.";
const NEUTRAL_TRIAL = "Contactul online nu este disponibil momentan pentru acest dealer.";
const NEUTRAL_ERROR = "Nu am putut trimite mesajul. Verifică datele și încearcă din nou.";
const NEUTRAL_RATE_LIMIT =
  "Prea multe solicitări. Încearcă din nou mai târziu.";

function isHoneypotFilled(formData: FormData): boolean {
  return String(formData.get("company") ?? "").trim().length > 0;
}

function rateLimitScope(tenantId: string, ipHash: string) {
  return {
    tenantId,
    ipHash,
    endpoint: PUBLIC_LEAD_RATE_LIMIT_ENDPOINT,
  } as const;
}

/**
 * Creates a storefront lead for the Host tenant + page vehicle slug.
 * Ignores any client-supplied tenant_id / vehicle_id.
 * Email notification is best-effort after a successful insert.
 *
 * VERCEL_DEMO_DISABLE_PUBLIC_LEADS: blocks insert with a neutral response (no DB write).
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

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const rootDomain = getRootDomain();
  if (isVercelDemoPublicLeadsDisabledFromRequest(host, rootDomain)) {
    return { error: NEUTRAL_TRIAL, success: false };
  }

  const resolved = await resolvePublicTenantFromHost();
  if (resolved.kind !== "ok") {
    return { error: NEUTRAL_ERROR, success: false };
  }

  const { tenant } = resolved;
  if (tenant.status !== "active") {
    return { error: NEUTRAL_TRIAL, success: false };
  }

  if (isHoneypotFilled(formData)) {
    return { error: null, success: true };
  }

  const clientIp = getTrustedClientIp((name) => headerStore.get(name));
  const ipHash = clientIp ? hashClientIpForRateLimit(clientIp) : null;
  const rateLimit = getPublicLeadRateLimitBackend();

  if (ipHash) {
    const attemptVerdict = rateLimit.checkAttempt(rateLimitScope(tenant.tenantId, ipHash));
    if (!attemptVerdict.allowed) {
      return {
        error: NEUTRAL_RATE_LIMIT,
        success: false,
        rateLimited: true,
        retryAfterSeconds: attemptVerdict.retryAfterSeconds,
      };
    }
    rateLimit.recordAttempt(rateLimitScope(tenant.tenantId, ipHash));
  }

  const parsed = parsePublicLeadForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error, success: false };
  }

  if (parsed.honeypotTriggered) {
    return { error: null, success: true };
  }

  const contactKey = buildLeadContactKey(parsed.data.email, parsed.data.phone);
  const cookieName = buildLeadCooldownCookieName(slug, contactKey);
  const cookieStore = await cookies();
  if (isLeadCooldownActive(cookieStore.get(cookieName)?.value)) {
    return { error: NEUTRAL_COOLDOWN, success: false };
  }

  const vehicleId = await getPublicVehicleIdForLead(tenant.tenantId, slug);
  if (!vehicleId) {
    return { error: NEUTRAL_ERROR, success: false };
  }

  if (
    await hasRecentLeadForContact(
      tenant.tenantId,
      vehicleId,
      parsed.data.email,
      parsed.data.phone,
    )
  ) {
    return { error: NEUTRAL_COOLDOWN, success: false };
  }

  if (ipHash) {
    const acceptVerdict = rateLimit.checkAccept(rateLimitScope(tenant.tenantId, ipHash));
    if (!acceptVerdict.allowed) {
      return {
        error: NEUTRAL_RATE_LIMIT,
        success: false,
        rateLimited: true,
        retryAfterSeconds: acceptVerdict.retryAfterSeconds,
      };
    }
  }

  let insertedLeadId: string | null = null;

  try {
    const db = getDb();
    await clearPublicSessionGucs(db);

    const inserted = await db
      .insert(leads)
      .values({
        tenantId: tenant.tenantId,
        vehicleId,
        name: parsed.data.name,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        message: parsed.data.message ?? null,
        source: "storefront",
        status: "new",
        assignedTo: null,
      })
      .returning({ id: leads.id });

    insertedLeadId = inserted[0]?.id ?? null;
    if (!insertedLeadId) {
      return { error: NEUTRAL_ERROR, success: false };
    }

    if (ipHash) {
      rateLimit.recordAccept(rateLimitScope(tenant.tenantId, ipHash));
    }

    cookieStore.set(cookieName, String(Date.now()), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.ceil(leadCooldownMs() / 1000),
    });
  } catch {
    return { error: NEUTRAL_ERROR, success: false };
  }

  // Best-effort notification — never affects public success response.
  try {
    const recipients = await loadLeadNotificationEmailsForTenant(tenant.tenantId);
    await maybeNotifyAfterPublicLeadInsert({
      tenantId: tenant.tenantId,
      leadId: insertedLeadId,
      recipients,
      lead: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        message: parsed.data.message,
      },
    });
  } catch {
    // swallow — lead already persisted
  }

  return { error: null, success: true };
}
