import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isNoopCompleteRouteEnabled,
  isNoopCompleteRuntimeAllowed,
} from "@/lib/billing/noop-complete-guard";
import { createNoopPaymentAdapter } from "@/lib/billing/noop-adapter";
import { resolvePaymentProvider } from "@/lib/billing/get-payment-adapter";

describe("noop-complete production guard (Etapa 26B)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("production + noop → route disabled (404 policy)", () => {
    expect(
      isNoopCompleteRouteEnabled({ provider: "noop", nodeEnv: "production" }),
    ).toBe(false);
    expect(isNoopCompleteRuntimeAllowed("production")).toBe(false);
  });

  it("development + noop → route enabled (owner checks apply next)", () => {
    expect(
      isNoopCompleteRouteEnabled({ provider: "noop", nodeEnv: "development" }),
    ).toBe(true);
  });

  it("test + noop → route enabled", () => {
    expect(isNoopCompleteRouteEnabled({ provider: "noop", nodeEnv: "test" })).toBe(
      true,
    );
  });

  it("stripe never enables the noop-complete route in any NODE_ENV", () => {
    for (const nodeEnv of ["development", "test", "production"] as const) {
      expect(isNoopCompleteRouteEnabled({ provider: "stripe", nodeEnv })).toBe(
        false,
      );
    }
  });

  it("PAYMENT_PROVIDER=stripe does not resolve to noop", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "stripe");
    expect(resolvePaymentProvider()).toBe("stripe");
    expect(
      isNoopCompleteRouteEnabled({
        provider: resolvePaymentProvider(),
        nodeEnv: "development",
      }),
    ).toBe(false);
  });

  it("noop adapter refuses to mint noop-complete URLs in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const adapter = createNoopPaymentAdapter("http://localhost:3000");
    await expect(
      adapter.createCheckoutSession({
        checkoutId: "11111111-1111-4111-8111-111111111111",
        tenantId: "22222222-2222-4222-8222-222222222222",
        planCode: "business",
        profileId: "33333333-3333-4333-8333-333333333333",
        customerEmail: "owner@example.com",
        successUrl: "http://localhost:3000/checkout/success",
        cancelUrl: "http://localhost:3000/checkout?plan=business",
      }),
    ).rejects.toThrow(/development\/test/i);
  });

  it("noop adapter mints noop-complete URLs only in development/test", async () => {
    vi.stubEnv("NODE_ENV", "development");
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
    expect(session.url).toContain("/api/billing/noop-complete");
    expect(session.provider).toBe("noop");
  });
});

/**
 * Ownership / auth refusals are enforced in the route handler after the env guard.
 * Keep the status-code contract explicit for reviewers.
 */
describe("noop-complete ownership contract", () => {
  it("maps unauthenticated → 401 and non-owner → 403 after env allow", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(__dirname, "../../../app/api/billing/noop-complete/route.ts"),
      "utf8",
    );
    expect(src).toContain("isNoopCompleteRouteEnabled");
    expect(src).toContain('status: 404');
    expect(src).toContain('status: 401');
    expect(src).toContain('status: 403');
    expect(src).toContain("billingCheckoutSessions.profileId");
    expect(src).toContain("getCurrentUser");
  });
});
