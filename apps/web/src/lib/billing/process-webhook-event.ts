import { sql } from "drizzle-orm";
import { getDb } from "@auto-platform/db";
import type { VerifiedWebhookEvent } from "@/lib/billing/payment-adapter";
import { revalidatePublicStorefrontPaths } from "@/lib/perf/public-storefront-cache";

export type ActivateCheckoutResult =
  | "activated"
  | "duplicate"
  | "already_completed"
  | "checkout_not_found"
  | "not_pending"
  | "invalid_provider"
  | "invalid_event"
  | "invalid_session"
  | string;

/**
 * Applies a verified provider event (idempotent). Call only after signature verify.
 * Uses SECURITY DEFINER — no service_role, no cookie session required.
 */
export async function processVerifiedBillingEvent(
  event: VerifiedWebhookEvent,
): Promise<ActivateCheckoutResult> {
  const db = getDb();
  const rows = await db.execute<{ activate_tenant_from_checkout: string }>(sql`
    select app.activate_tenant_from_checkout(
      ${event.provider},
      ${event.eventId},
      ${event.eventType},
      ${event.externalSessionId},
      ${event.externalSubscriptionId},
      ${event.payloadHash}
    ) as activate_tenant_from_checkout
  `);

  const list = Array.from(rows as unknown as { activate_tenant_from_checkout: string }[]);
  const outcome = list[0]?.activate_tenant_from_checkout ?? "invalid_event";

  if (outcome === "activated") {
    // Best-effort: resolve tenant id from checkout for cache tag.
    const tenantRows = await db.execute<{ tenant_id: string }>(sql`
      select tenant_id::text
      from public.billing_checkout_sessions
      where provider = ${event.provider}::public.billing_provider
        and external_session_id = ${event.externalSessionId}
      limit 1
    `);
    const tenantList = Array.from(tenantRows as unknown as { tenant_id: string }[]);
    const tenantId = tenantList[0]?.tenant_id ?? null;
    revalidatePublicStorefrontPaths({ tenantId });
  }

  return outcome;
}
