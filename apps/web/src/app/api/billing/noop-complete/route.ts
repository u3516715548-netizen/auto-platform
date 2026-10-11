import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { billingCheckoutSessions, getDb } from "@auto-platform/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { isNoopCompleteRouteEnabled } from "@/lib/billing/noop-complete-guard";
import { signNoopWebhookPayload } from "@/lib/billing/noop-adapter";
import { processVerifiedBillingEvent } from "@/lib/billing/process-webhook-event";

export const runtime = "nodejs";

/**
 * Dev/test helper: completes a noop checkout (never in Production).
 * Requires PAYMENT_PROVIDER=noop + NODE_ENV development|test + authenticated owner.
 */
export async function GET(request: Request) {
  if (!isNoopCompleteRouteEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user?.profile) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id")?.trim();
  if (!sessionId || !sessionId.startsWith("noop_cs_")) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  }

  const db = getDb();
  const [owned] = await db
    .select({ id: billingCheckoutSessions.id })
    .from(billingCheckoutSessions)
    .where(
      and(
        eq(billingCheckoutSessions.externalSessionId, sessionId),
        eq(billingCheckoutSessions.profileId, user.profile.id),
      ),
    )
    .limit(1);

  if (!owned) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const eventId = `noop_evt_${createHash("sha256").update(sessionId).digest("hex").slice(0, 24)}`;
  const rawBody = JSON.stringify({
    id: eventId,
    type: "checkout.session.completed",
    data: {
      externalSessionId: sessionId,
      externalSubscriptionId: `noop_sub_${sessionId.slice(-12)}`,
    },
  });
  const signature = signNoopWebhookPayload(rawBody);

  const { createNoopPaymentAdapter } = await import("@/lib/billing/noop-adapter");
  const adapter = createNoopPaymentAdapter(url.origin);
  let event;
  try {
    event = await adapter.parseAndVerifyWebhook(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  if (!event) {
    return NextResponse.json({ error: "ignored" }, { status: 400 });
  }

  const outcome = await processVerifiedBillingEvent(event);
  const success = new URL("/checkout/success", url.origin);
  success.searchParams.set("session_id", sessionId);
  success.searchParams.set("outcome", outcome);
  return NextResponse.redirect(success);
}
