"use server";

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { financeApplications, getDb, leads } from "@auto-platform/db";
import { FINANCE_CONSENT_VERSION } from "@auto-platform/types";
import { hasRecentLeadForContact } from "@/lib/leads/lead-contact-dedup";
import { buildLeadContactKey } from "@/lib/leads/lead-contact";
import { loadLeadNotificationEmailsForTenant } from "@/lib/leads/load-notification-emails";
import {
  getPublicLeadRateLimitBackend,
  PUBLIC_FINANCE_RATE_LIMIT_ENDPOINT,
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
import {
  parseFinanceApplicationForm,
  parseVehicleSlugParam,
} from "@/lib/storefront/parse-finance-application";
import { resolvePublicTenantFromHost } from "@/lib/storefront/resolve-public-tenant";
import { getPublicVehicleForFinance } from "@/lib/storefront/public-vehicles";
import {
  calculateFixedMonthlyPayment,
} from "@/lib/storefront/storefront-vehicle-lite";
import { getRootDomain } from "@/lib/supabase/env";
import { isHobbyDemoPublicLeadsDisabledFromRequest } from "@/lib/tenant/vercel-demo-only";

export type CreateFinanceApplicationState = {
  error: string | null;
  success: boolean;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
};

const NEUTRAL_COOLDOWN = "Cererea a fost deja înregistrată. Poți încerca din nou mai târziu.";
const NEUTRAL_TRIAL = "Contactul online nu este disponibil momentan pentru acest dealer.";
const NEUTRAL_ERROR = "Nu am putut înregistra cererea. Verifică datele și încearcă din nou.";
const NEUTRAL_RATE_LIMIT = "Prea multe solicitări. Încearcă din nou mai târziu.";
const FINANCE_APR = 4.9;
const FINANCE_COOLDOWN_PREFIX = "sf_fin_cd_";

function isHoneypotFilled(formData: FormData): boolean {
  return String(formData.get("website") ?? "").trim().length > 0;
}

function rateLimitScope(tenantId: string, ipHash: string) {
  return {
    tenantId,
    ipHash,
    endpoint: PUBLIC_FINANCE_RATE_LIMIT_ENDPOINT,
  } as const;
}

function buildFinanceCooldownCookieName(vehicleSlug: string, contactKey: string): string {
  // Reuse lead cookie hashing, with a finance-specific prefix via slug namespace.
  return buildLeadCooldownCookieName(`fin:${vehicleSlug}`, contactKey).replace(
    /^sf_lead_cd_/,
    FINANCE_COOLDOWN_PREFIX,
  );
}

function buildFinanceLeadMessage(input: {
  applicantType: "individual" | "company";
  amountEur: number;
  termMonths: number;
  estimatedMonthlyEur: number;
}): string {
  const kind = input.applicantType === "company" ? "Firmă" : "Persoană fizică";
  return [
    "Cerere de finanțare (estimativă, neangajantă).",
    `Tip: ${kind}.`,
    `Sumă: ${input.amountEur.toFixed(2)} EUR.`,
    `Perioadă: ${input.termMonths} luni.`,
    `Rată estimată: ${input.estimatedMonthlyEur.toFixed(2)} EUR/lună.`,
  ].join(" ");
}

/**
 * Creates a finance application + companion lead (source=finance) for Host tenant + vehicle slug.
 * Notification is best-effort on the companion lead (Etapa 17 path).
 * Public response never exposes ids, notification status, or technical reasons.
 *
 * HOBBY_DEMO_DISABLE_PUBLIC_LEADS: blocks insert with a neutral response (no DB write).
 */
export async function createFinanceApplicationAction(
  vehicleSlugRaw: string,
  _prev: CreateFinanceApplicationState | null,
  formData: FormData,
): Promise<CreateFinanceApplicationState> {
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

  const parsed = parseFinanceApplicationForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error, success: false };
  }
  if (parsed.honeypotTriggered) {
    return { error: null, success: true };
  }

  const contactKey = buildLeadContactKey(parsed.data.email, parsed.data.phone);
  const cookieName = buildFinanceCooldownCookieName(slug, contactKey);
  const cookieStore = await cookies();
  if (isLeadCooldownActive(cookieStore.get(cookieName)?.value)) {
    return { error: NEUTRAL_COOLDOWN, success: false };
  }

  const vehicle = await getPublicVehicleForFinance(tenant.tenantId, slug);
  if (!vehicle) {
    return { error: NEUTRAL_ERROR, success: false };
  }

  if (parsed.data.amountEur > vehicle.priceEur) {
    return { error: "Suma nu poate depăși prețul vehiculului.", success: false };
  }

  if (
    await hasRecentLeadForContact(
      tenant.tenantId,
      vehicle.id,
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
  const applicationId = randomUUID();
  const consentAt = new Date();
  const estimatedMonthly = Math.round(
    calculateFixedMonthlyPayment(parsed.data.amountEur, FINANCE_APR, parsed.data.termMonths) * 100,
  ) / 100;
  const amountStr = parsed.data.amountEur.toFixed(2);
  const priceStr = vehicle.priceEur.toFixed(2);
  const monthlyStr = estimatedMonthly.toFixed(2);

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await clearPublicSessionGucs(tx as unknown as ReturnType<typeof getDb>);

      const [leadRow] = await tx
        .insert(leads)
        .values({
          id: leadId,
          tenantId: tenant.tenantId,
          vehicleId: vehicle.id,
          name: parsed.data.fullName,
          email: parsed.data.email,
          phone: parsed.data.phone,
          message: buildFinanceLeadMessage({
            applicantType: parsed.data.applicantType,
            amountEur: parsed.data.amountEur,
            termMonths: parsed.data.termMonths,
            estimatedMonthlyEur: estimatedMonthly,
          }),
          source: "finance",
          status: "new",
          assignedTo: null,
          consentAt,
          consentVersion: FINANCE_CONSENT_VERSION,
          notificationStatus: "pending",
          notificationAttemptedAt: null,
          notificationReason: null,
        })
        .returning({ id: leads.id, tenantId: leads.tenantId });

      if (!leadRow?.id || leadRow.tenantId !== tenant.tenantId) {
        throw new Error("lead_insert_failed");
      }

      const [appRow] = await tx
        .insert(financeApplications)
        .values({
          id: applicationId,
          tenantId: tenant.tenantId,
          vehicleId: vehicle.id,
          leadId,
          applicantType: parsed.data.applicantType,
          fullName: parsed.data.fullName,
          companyTaxId: parsed.data.companyTaxId ?? null,
          email: parsed.data.email,
          phone: parsed.data.phone,
          amountEur: amountStr,
          termMonths: parsed.data.termMonths,
          vehiclePriceEurSnapshot: priceStr,
          estimatedMonthlyEurSnapshot: monthlyStr,
          consentAt,
          consentVersion: FINANCE_CONSENT_VERSION,
          status: "new",
        })
        .returning({ id: financeApplications.id, tenantId: financeApplications.tenantId });

      if (!appRow?.id || appRow.tenantId !== tenant.tenantId) {
        throw new Error("finance_insert_failed");
      }
    });

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
        name: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        message: buildFinanceLeadMessage({
          applicantType: parsed.data.applicantType,
          amountEur: parsed.data.amountEur,
          termMonths: parsed.data.termMonths,
          estimatedMonthlyEur: estimatedMonthly,
        }),
      },
    });
  } catch {
    notifyResult = { attempted: true, sent: false, reason: "provider_error" };
  }

  const persistence = mapLeadNotifyResultToPersistence(notifyResult);
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
    // Application already saved — never fail the public response.
  }

  return { error: null, success: true };
}
