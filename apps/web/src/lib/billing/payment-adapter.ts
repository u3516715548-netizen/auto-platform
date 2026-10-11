/**
 * Provider-agnostic payment adapter (Etapa 26B).
 * UI / entitlements must not import Stripe/Netopia SDKs — only this contract + factory.
 */

export type PaymentProviderId = "stripe" | "netopia" | "noop";

export type CreateCheckoutSessionInput = {
  checkoutId: string;
  tenantId: string;
  planCode: "plan_50" | "business" | "premium";
  profileId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutSessionResult = {
  provider: PaymentProviderId;
  externalSessionId: string;
  url: string;
};

export type VerifiedWebhookEvent = {
  provider: PaymentProviderId;
  eventId: string;
  eventType: string;
  /** Provider checkout session id. */
  externalSessionId: string;
  externalSubscriptionId: string | null;
  payloadHash: string | null;
};

export type PaymentAdapter = {
  readonly provider: PaymentProviderId;
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionResult>;
  /**
   * Verify provider signature and parse a checkout-completed style event.
   * Returns null when the event type is ignored (not an activation event).
   */
  parseAndVerifyWebhook(
    rawBody: string,
    signatureHeader: string | null,
  ): Promise<VerifiedWebhookEvent | null>;
};
