import { resolvePaymentProvider } from "@/lib/billing/get-payment-adapter";

/**
 * `/api/billing/noop-complete` is a local activator only.
 * Never enable via a production-toggleable env flag — only NODE_ENV.
 */
export function isNoopCompleteRuntimeAllowed(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv === "development" || nodeEnv === "test";
}

/**
 * Route is reachable only when provider is noop AND runtime is development/test.
 * Production always denies (404), even if PAYMENT_PROVIDER=noop.
 */
export function isNoopCompleteRouteEnabled(input?: {
  provider?: string;
  nodeEnv?: string | undefined;
}): boolean {
  const provider = (input?.provider ?? resolvePaymentProvider()).toLowerCase();
  if (provider !== "noop") return false;
  return isNoopCompleteRuntimeAllowed(input?.nodeEnv ?? process.env.NODE_ENV);
}
