import { NextResponse } from "next/server";
import { getPaymentAdapter, resolvePaymentProvider } from "@/lib/billing/get-payment-adapter";
import { processVerifiedBillingEvent } from "@/lib/billing/process-webhook-event";

export const runtime = "nodejs";

/**
 * Provider webhook — no cookie session. Signature verified by PaymentAdapter.
 */
export async function POST(request: Request) {
  const provider = resolvePaymentProvider();
  if (provider === "netopia") {
    return NextResponse.json({ error: "not_implemented" }, { status: 501 });
  }

  const rawBody = await request.text();
  const signature =
    request.headers.get("stripe-signature") ??
    request.headers.get("x-billing-signature");

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";

  let adapter;
  try {
    adapter = getPaymentAdapter(origin);
  } catch {
    return NextResponse.json({ error: "provider_misconfigured" }, { status: 503 });
  }

  let event;
  try {
    event = await adapter.parseAndVerifyWebhook(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (!event) {
    // Ignored event types — acknowledge to stop retries.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const outcome = await processVerifiedBillingEvent(event);
  if (
    outcome === "activated" ||
    outcome === "duplicate" ||
    outcome === "already_completed"
  ) {
    return NextResponse.json({ ok: true, outcome });
  }

  if (outcome === "checkout_not_found") {
    return NextResponse.json({ error: outcome }, { status: 404 });
  }

  return NextResponse.json({ error: outcome }, { status: 422 });
}
