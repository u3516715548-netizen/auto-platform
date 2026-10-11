import { describe, expect, it } from "vitest";
import {
  createNoopPaymentAdapter,
  signNoopWebhookPayload,
} from "@/lib/billing/noop-adapter";

describe("noop PaymentAdapter (Etapa 26B)", () => {
  it("creates a local complete URL and session id", async () => {
    const adapter = createNoopPaymentAdapter("http://localhost:3000");
    const session = await adapter.createCheckoutSession({
      checkoutId: "11111111-1111-4111-8111-111111111111",
      tenantId: "22222222-2222-4222-8222-222222222222",
      planCode: "business",
      profileId: "33333333-3333-4333-8333-333333333333",
      customerEmail: "owner@example.com",
      successUrl: "http://localhost:3000/checkout/success",
      cancelUrl: "http://localhost:3000/checkout?plan=business",
    });
    expect(adapter.provider).toBe("noop");
    expect(session.externalSessionId.startsWith("noop_cs_")).toBe(true);
    expect(session.url).toContain("/api/billing/noop-complete");
    expect(session.url).toContain("session_id=");
  });

  it("rejects missing or invalid webhook signatures", async () => {
    const adapter = createNoopPaymentAdapter("http://localhost:3000");
    const body = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { externalSessionId: "noop_cs_abc" },
    });

    await expect(adapter.parseAndVerifyWebhook(body, null)).rejects.toThrow(
      "missing_signature",
    );
    await expect(adapter.parseAndVerifyWebhook(body, "deadbeef")).rejects.toThrow(
      "invalid_signature",
    );
  });

  it("accepts a valid signature and parses activation events", async () => {
    const adapter = createNoopPaymentAdapter("http://localhost:3000");
    const body = JSON.stringify({
      id: "evt_ok",
      type: "checkout.session.completed",
      data: {
        externalSessionId: "noop_cs_ok",
        externalSubscriptionId: "noop_sub_1",
      },
    });
    const sig = signNoopWebhookPayload(body);
    const event = await adapter.parseAndVerifyWebhook(body, sig);
    expect(event).toMatchObject({
      provider: "noop",
      eventId: "evt_ok",
      externalSessionId: "noop_cs_ok",
      externalSubscriptionId: "noop_sub_1",
    });
  });

  it("ignores non-activation event types after verify", async () => {
    const adapter = createNoopPaymentAdapter("http://localhost:3000");
    const body = JSON.stringify({
      id: "evt_other",
      type: "customer.updated",
      data: { externalSessionId: "noop_cs_x" },
    });
    const sig = signNoopWebhookPayload(body);
    await expect(adapter.parseAndVerifyWebhook(body, sig)).resolves.toBeNull();
  });
});
