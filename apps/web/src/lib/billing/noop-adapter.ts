import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type {
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
  PaymentAdapter,
  VerifiedWebhookEvent,
} from "@/lib/billing/payment-adapter";

function noopWebhookSecret(): string {
  return (
    process.env.BILLING_NOOP_WEBHOOK_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    "noop-dev-only-webhook-secret"
  );
}

export function signNoopWebhookPayload(rawBody: string): string {
  return createHmac("sha256", noopWebhookSecret()).update(rawBody).digest("hex");
}

export function createNoopPaymentAdapter(appOrigin: string): PaymentAdapter {
  return {
    provider: "noop",

    async createCheckoutSession(
      input: CreateCheckoutSessionInput,
    ): Promise<CreateCheckoutSessionResult> {
      const externalSessionId = `noop_cs_${input.checkoutId.replace(/-/g, "").slice(0, 24)}`;
      const url = new URL("/api/billing/noop-complete", appOrigin);
      url.searchParams.set("session_id", externalSessionId);
      return {
        provider: "noop",
        externalSessionId,
        url: url.toString(),
      };
    },

    async parseAndVerifyWebhook(
      rawBody: string,
      signatureHeader: string | null,
    ): Promise<VerifiedWebhookEvent | null> {
      if (!signatureHeader) {
        throw new Error("missing_signature");
      }
      const expected = signNoopWebhookPayload(rawBody);
      const a = Buffer.from(expected);
      const b = Buffer.from(signatureHeader.trim());
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new Error("invalid_signature");
      }

      let parsed: {
        id?: string;
        type?: string;
        data?: {
          externalSessionId?: string;
          externalSubscriptionId?: string | null;
        };
      };
      try {
        parsed = JSON.parse(rawBody) as typeof parsed;
      } catch {
        throw new Error("invalid_json");
      }

      if (parsed.type !== "checkout.session.completed") {
        return null;
      }
      const externalSessionId = parsed.data?.externalSessionId?.trim();
      if (!parsed.id || !externalSessionId) {
        throw new Error("invalid_payload");
      }

      return {
        provider: "noop",
        eventId: parsed.id,
        eventType: parsed.type,
        externalSessionId,
        externalSubscriptionId: parsed.data?.externalSubscriptionId?.trim() || null,
        payloadHash: createHash("sha256").update(rawBody).digest("hex"),
      };
    },
  };
}
