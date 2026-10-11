import { createHash } from "node:crypto";
import Stripe from "stripe";
import type {
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
  PaymentAdapter,
  VerifiedWebhookEvent,
} from "@/lib/billing/payment-adapter";
import { stripePriceIdForPlan } from "@/lib/billing/stripe-prices";

function requireStripeSecret(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return key;
}

function requireStripeWebhookSecret(): string {
  const key = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!key) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return key;
}

export function createStripePaymentAdapter(): PaymentAdapter {
  const stripe = new Stripe(requireStripeSecret());

  return {
    provider: "stripe",

    async createCheckoutSession(
      input: CreateCheckoutSessionInput,
    ): Promise<CreateCheckoutSessionResult> {
      const priceId = stripePriceIdForPlan(input.planCode);
      if (!priceId) {
        throw new Error(`Missing Stripe price env for plan ${input.planCode}`);
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: input.customerEmail,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.checkoutId,
        metadata: {
          checkout_id: input.checkoutId,
          tenant_id: input.tenantId,
          plan_code: input.planCode,
          profile_id: input.profileId,
        },
        subscription_data: {
          metadata: {
            checkout_id: input.checkoutId,
            tenant_id: input.tenantId,
            plan_code: input.planCode,
          },
        },
      });

      if (!session.id || !session.url) {
        throw new Error("Stripe Checkout session missing id/url");
      }

      return {
        provider: "stripe",
        externalSessionId: session.id,
        url: session.url,
      };
    },

    async parseAndVerifyWebhook(
      rawBody: string,
      signatureHeader: string | null,
    ): Promise<VerifiedWebhookEvent | null> {
      if (!signatureHeader) {
        throw new Error("missing_signature");
      }

      const event = stripe.webhooks.constructEvent(
        rawBody,
        signatureHeader,
        requireStripeWebhookSecret(),
      );

      if (event.type !== "checkout.session.completed") {
        return null;
      }

      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.id) {
        throw new Error("invalid_payload");
      }

      const subscriptionRef = session.subscription;
      const externalSubscriptionId =
        typeof subscriptionRef === "string"
          ? subscriptionRef
          : subscriptionRef && typeof subscriptionRef === "object" && "id" in subscriptionRef
            ? String(subscriptionRef.id)
            : null;

      return {
        provider: "stripe",
        eventId: event.id,
        eventType: event.type,
        externalSessionId: session.id,
        externalSubscriptionId,
        payloadHash: createHash("sha256").update(rawBody).digest("hex"),
      };
    },
  };
}
