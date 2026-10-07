"use server";

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDb, leads } from "@auto-platform/db";
import { PUBLIC_LEAD_CONSENT_VERSION } from "@auto-platform/types";
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
import { mapLeadNotifyResultToPersistence } from "@/lib/notifications/map-lead-notification-status";
import {
  maybeNotifyAfterPublicLeadInsert,
  type LeadEmailNotifyResult,
} from "@/lib/notifications/lead-email";
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
import { isHobbyDemoPublicLeadsDisabledFromRequest } from "@/lib/tenant/vercel-demo-only";

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
 * Email notification is best-effort; outcome is persisted on the lead row.
 * Public response never exposes notification status, ids, or technical reasons.
 *
 * HOBBY_DEMO_DISABLE_PUBLIC_LEADS: blocks insert with a neutral response (no DB write).
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
  if (isHobbyDemoPublicLeadsDisabledFromRequest(host, rootDomain)) {
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

  if (!parsed.data.consent) {
    return { error: "Consimțământul este obligatoriu", success: false };
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

  const leadId = randomUUID();
  const consentAt = new Date();

  try {
    const db = getDb();
    await clearPublicSessionGucs(db);

    const inserted = await db
      .insert(leads)
      .values({
        id: leadId,
        tenantId: tenant.tenantId,
        vehicleId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        message: parsed.data.message ?? null,
        source: "storefront",
        status: "new",
        assignedTo: null,
        consentAt,
        consentVersion: PUBLIC_LEAD_CONSENT_VERSION,
        notificationStatus: "pending",
        notificationAttemptedAt: null,
        notificationReason: null,
      })
      .returning({ id: leads.id, tenantId: leads.tenantId });

    if (!inserted[0]?.id || inserted[0].tenantId !== tenant.tenantId) {
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
  let notifyResult: LeadEmailNotifyResult = {
    attempted: false,
    sent: false,
    reason: "no_recipients",
  };
  try {
    const recipients = await loadLeadNotificationEmailsForTenant(tenant.tenantId);
    notifyResult = await maybeNotifyAfterPublicLeadInsert({
      tenantId: tenant.tenantId,
      leadId,
      recipients,
      lead: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        message: parsed.data.message,
      },
    });
  } catch {
    notifyResult = { attempted: true, sent: false, reason: "provider_error" };
  }

  const persistence = mapLeadNotifyResultToPersistence(notifyResult);

  // Persist notification outcome via narrow SECURITY DEFINER helper (staff-only UPDATE RLS).
  // Touches only notification_* for this leadId + tenantId; never fails the public response.
  try {
    const db = getDb();
    await clearPublicSessionGucs(db);
    await db.execute(
      sql`select app.finalize_lead_notification(
        ${leadId}::uuid,
        ${tenant.tenantId}::uuid,
        ${persistence.notificationStatus}::public.lead_notification_status,
        ${persistence.notificationReason}
      )`,
    );
  } catch {
    // Lead already saved — notification status may remain pending; never fail the user.
  }

  return { error: null, success: true };
}
