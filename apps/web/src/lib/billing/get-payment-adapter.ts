import type { PaymentAdapter, PaymentProviderId } from "@/lib/billing/payment-adapter";
import { createNoopPaymentAdapter } from "@/lib/billing/noop-adapter";
import { createStripePaymentAdapter } from "@/lib/billing/stripe-adapter";

export function resolvePaymentProvider(): PaymentProviderId {
  const raw = (process.env.PAYMENT_PROVIDER ?? "noop").trim().toLowerCase();
  if (raw === "stripe" || raw === "netopia" || raw === "noop") {
    return raw;
  }
  return "noop";
}

/**
 * Factory — Stripe SDK only loaded when provider is stripe.
 * Netopia reserved (throws until implemented).
 */
export function getPaymentAdapter(appOrigin: string): PaymentAdapter {
  const provider = resolvePaymentProvider();
  if (provider === "stripe") {
    return createStripePaymentAdapter();
  }
  if (provider === "netopia") {
    throw new Error("Netopia PaymentAdapter is not implemented (use stripe or noop)");
  }
  return createNoopPaymentAdapter(appOrigin);
}
