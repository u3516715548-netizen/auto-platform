import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { resolvePaymentProvider } from "@/lib/billing/get-payment-adapter";
import { signNoopWebhookPayload } from "@/lib/billing/noop-adapter";
import { processVerifiedBillingEvent } from "@/lib/billing/process-webhook-event";

export const runtime = "nodejs";

/**
 * Dev/test helper: completes a noop checkout session (PAYMENT_PROVIDER=noop only).
 * Never enabled for stripe/netopia.
 */
export async function GET(request: Request) {
  if (resolvePaymentProvider() !== "noop") {
    return NextResponse.json({ error: "noop_disabled" }, { status: 404 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id")?.trim();
  if (!sessionId || !sessionId.startsWith("noop_cs_")) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 });
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

  // Local verify path mirrors webhook route.
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
