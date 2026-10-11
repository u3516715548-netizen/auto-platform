"use server";

import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@auto-platform/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ensureCheckoutProfile } from "@/lib/billing/ensure-checkout-profile";
import { getPaymentAdapter } from "@/lib/billing/get-payment-adapter";
import {
  isReservedTenantSlug,
  isValidTenantSlug,
  normalizeTenantSlug,
  parseSelfServePlanCode,
  type SelfServePlanCode,
} from "@/lib/billing/plan-codes";
import { loginPath } from "@/lib/auth/auth-redirects";
import { isCommercialSelfServeCheckoutEnabled } from "@/lib/marketing/commercial-plans";
import { getRootDomain } from "@/lib/supabase/env";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolve-tenant-from-host";

export type StartCheckoutState = {
  error?: string;
  success?: boolean;
};

function mapBeginError(message: string): string {
  if (message.includes("invalid_plan")) return "Plan invalid pentru self-checkout.";
  if (message.includes("invalid_name")) return "Numele dealerului trebuie să aibă 2–80 caractere.";
  if (message.includes("invalid_slug")) {
    return "Slug invalid. Folosește litere mici, cifre și cratimă (2–48 caractere).";
  }
  if (message.includes("reserved_slug")) return "Acest subdomeniu este rezervat.";
  if (message.includes("slug_taken")) return "Subdomeniul este deja folosit.";
  if (message.includes("pending_exists")) {
    return "Ai deja un checkout în curs. Finalizează plata sau așteaptă expirarea.";
  }
  if (message.includes("already_owner")) {
    return "Contul deține deja un dealer activ. Contactează suportul pentru un plan nou.";
  }
  if (message.includes("profile_missing")) return "Profil lipsă. Reîncearcă autentificarea.";
  return "Nu am putut porni checkout-ul. Încearcă din nou.";
}

function appOriginFromHeaders(headerStore: Headers): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (envUrl) return envUrl;
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Auth-first self-serve checkout (apex only).
 * Creates suspended draft tenant + pending session, then redirects to provider.
 */
export async function startSelfServeCheckoutAction(
  _prev: StartCheckoutState | null,
  formData: FormData,
): Promise<StartCheckoutState> {
  if (!isCommercialSelfServeCheckoutEnabled()) {
    return {
      error: "Self-checkout este temporar dezactivat. Contactează-ne pentru activare.",
      success: false,
    };
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const rootDomain = getRootDomain();
  const hostKind = resolveTenantSlugFromHost(host, rootDomain);
  if (hostKind.kind !== "apex") {
    return { error: "Checkout-ul comercial este disponibil doar pe domeniul platformei.", success: false };
  }

  const plan = parseSelfServePlanCode(String(formData.get("plan") ?? ""));
  if (!plan) {
    return { error: "Plan invalid.", success: false };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeTenantSlug(String(formData.get("slug") ?? ""));

  if (name.length < 2 || name.length > 80) {
    return { error: "Numele dealerului trebuie să aibă 2–80 caractere.", success: false };
  }
  if (!isValidTenantSlug(slug)) {
    return {
      error: "Slug invalid. Folosește litere mici, cifre și cratimă (2–48 caractere).",
      success: false,
    };
  }
  if (isReservedTenantSlug(slug)) {
    return { error: "Acest subdomeniu este rezervat.", success: false };
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath({ plan, next: `/checkout?plan=${plan}` }));
  }

  const profileResult = await ensureCheckoutProfile({
    authUserId: user.authUserId,
    authEmail: user.email ?? user.profile?.email ?? null,
    displayName: user.profile?.name ?? name,
  });
  if ("error" in profileResult) {
    return { error: "Profil invalid. Reautentifică-te și încearcă din nou.", success: false };
  }

  const db = getDb();
  let checkoutId: string;
  let tenantId: string;
  let planCode: SelfServePlanCode;

  try {
    const rows = await db.execute<{
      checkout_id: string;
      tenant_id: string;
      plan_code: string;
    }>(sql`
      select * from app.begin_self_serve_checkout(
        ${profileResult.profileId}::uuid,
        ${plan},
        ${name},
        ${slug}
      )
    `);
    const list = Array.from(
      rows as unknown as { checkout_id: string; tenant_id: string; plan_code: string }[],
    );
    const row = list[0];
    if (!row?.checkout_id || !row.tenant_id) {
      return { error: "Nu am putut crea sesiunea de checkout.", success: false };
    }
    checkoutId = row.checkout_id;
    tenantId = row.tenant_id;
    planCode = row.plan_code as SelfServePlanCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: mapBeginError(message), success: false };
  }

  const origin = appOriginFromHeaders(headerStore);
  const adapter = getPaymentAdapter(origin);
  const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/checkout?plan=${planCode}&canceled=1`;

  let externalSessionId: string;
  let checkoutUrl: string;
  try {
    const session = await adapter.createCheckoutSession({
      checkoutId,
      tenantId,
      planCode,
      profileId: profileResult.profileId,
      customerEmail: profileResult.email,
      successUrl,
      cancelUrl,
    });
    externalSessionId = session.externalSessionId;
    checkoutUrl = session.url;
  } catch {
    return {
      error: "Providerul de plată nu este configurat corect. Încearcă mai târziu.",
      success: false,
    };
  }

  const attachRows = await db.execute<{ attach_checkout_provider_session: string }>(sql`
    select app.attach_checkout_provider_session(
      ${checkoutId}::uuid,
      ${profileResult.profileId}::uuid,
      ${adapter.provider},
      ${externalSessionId}
    ) as attach_checkout_provider_session
  `);
  const attachList = Array.from(
    attachRows as unknown as { attach_checkout_provider_session: string }[],
  );
  if (attachList[0]?.attach_checkout_provider_session !== "ok") {
    return { error: "Nu am putut lega sesiunea de plată. Încearcă din nou.", success: false };
  }

  redirect(checkoutUrl);
}
