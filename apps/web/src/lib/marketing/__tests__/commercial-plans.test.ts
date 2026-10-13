import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_CONTACT_EMAIL,
  COMMERCIAL_PLANS,
  commercialInterestMailtoHref,
  commercialPlanContactHref,
  commercialPlanPublicCta,
  commercialPlanSignupHref,
  commercialPlansForPricingGrid,
  formatVehicleLimitRo,
  getCommercialPlan,
  isCommercialSelfServeCheckoutEnabled,
  isStripePublicCheckoutConfigured,
} from "@/lib/marketing/commercial-plans";

const webRoot = resolve(__dirname, "../../..");

const stripeReadyEnv = {
  COMMERCIAL_SELF_SERVE_CHECKOUT: "1",
  PAYMENT_PROVIDER: "stripe",
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  STRIPE_PRICE_PLAN_50: "price_50",
  STRIPE_PRICE_BUSINESS: "price_biz",
  STRIPE_PRICE_PREMIUM: "price_prem",
} as const;

describe("commercial plans catalog (Etapa 26A)", () => {
  it("exposes the four confirmed packages with RON monthly prices", () => {
    expect(COMMERCIAL_PLANS).toHaveLength(4);
    expect(COMMERCIAL_PLANS.map((p) => p.code)).toEqual([
      "plan_50",
      "business",
      "premium",
      "enterprise",
    ]);
    expect(getCommercialPlan("plan_50")).toMatchObject({
      maxPublishedVehicles: 50,
      priceRonMonthly: 149,
      selfServeCheckout: true,
    });
    expect(getCommercialPlan("business")).toMatchObject({
      maxPublishedVehicles: 150,
      priceRonMonthly: 299,
    });
    expect(getCommercialPlan("premium")).toMatchObject({
      maxPublishedVehicles: 500,
      priceRonMonthly: 599,
    });
    expect(getCommercialPlan("enterprise")).toMatchObject({
      maxPublishedVehicles: null,
      priceRonMonthly: null,
      selfServeCheckout: false,
      priceLabel: "Preț negociat",
    });
  });

  it("keeps auth-first signup href helper for when self-serve is enabled", () => {
    expect(commercialPlanSignupHref("business")).toBe("/login?plan=business");
    expect(formatVehicleLimitRo(50)).toBe("50 mașini");
    expect(formatVehicleLimitRo(null)).toBe("Nelimitat*");
  });

  it("does not enable public checkout from the opt-in flag alone", () => {
    expect(isCommercialSelfServeCheckoutEnabled({})).toBe(false);
    expect(
      isCommercialSelfServeCheckoutEnabled({ COMMERCIAL_SELF_SERVE_CHECKOUT: "1" }),
    ).toBe(false);
    expect(
      isCommercialSelfServeCheckoutEnabled({
        COMMERCIAL_SELF_SERVE_CHECKOUT: "1",
        PAYMENT_PROVIDER: "noop",
      }),
    ).toBe(false);
    expect(
      isCommercialSelfServeCheckoutEnabled({
        COMMERCIAL_SELF_SERVE_CHECKOUT: "1",
        PAYMENT_PROVIDER: "stripe",
        STRIPE_SECRET_KEY: "sk_test_x",
        // missing webhook + prices
      }),
    ).toBe(false);
  });

  it("requires Stripe provider + secrets + all three price IDs with the opt-in flag", () => {
    expect(isStripePublicCheckoutConfigured(stripeReadyEnv)).toBe(true);
    expect(isCommercialSelfServeCheckoutEnabled(stripeReadyEnv)).toBe(true);
    expect(
      isCommercialSelfServeCheckoutEnabled({
        ...stripeReadyEnv,
        COMMERCIAL_SELF_SERVE_CHECKOUT: "0",
      }),
    ).toBe(false);
    expect(
      isCommercialSelfServeCheckoutEnabled({
        ...stripeReadyEnv,
        STRIPE_PRICE_PREMIUM: "",
      }),
    ).toBe(false);
  });

  it("routes public CTAs to contact when self-serve is off (incl. paid plans)", () => {
    const keys = [
      "COMMERCIAL_SELF_SERVE_CHECKOUT",
      "PAYMENT_PROVIDER",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_PLAN_50",
      "STRIPE_PRICE_BUSINESS",
      "STRIPE_PRICE_PREMIUM",
    ] as const;
    const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    for (const k of keys) delete process.env[k];
    try {
      for (const code of ["plan_50", "business", "premium", "enterprise"] as const) {
        const plan = getCommercialPlan(code);
        const cta = commercialPlanPublicCta(plan);
        expect(cta.kind).toBe("contact");
        expect(cta.href).toBe(commercialPlanContactHref(plan));
        expect(cta.href).toContain(`mailto:${COMMERCIAL_CONTACT_EMAIL}`);
        expect(cta.href).toContain("AUTOBEAR");
        expect(cta.label).toBe(`Scrie-ne pentru ${plan.name}`);
        expect(cta.href).not.toContain("/login?plan=");
        expect(cta.href).not.toContain("/checkout");
      }
    } finally {
      for (const k of keys) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    }
  });

  it("routes self-serve plans to login?plan= only when flag + Stripe are ready", () => {
    const keys = Object.keys(stripeReadyEnv) as (keyof typeof stripeReadyEnv)[];
    const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    Object.assign(process.env, stripeReadyEnv);
    try {
      expect(commercialPlanPublicCta(getCommercialPlan("business"))).toMatchObject({
        kind: "checkout",
        href: "/login?plan=business",
      });
      expect(commercialPlanPublicCta(getCommercialPlan("enterprise")).kind).toBe("contact");
    } finally {
      for (const k of keys) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    }
  });

  it("keeps plan limits in the shared module (not hardcoded in pricing UI)", () => {
    const grid = readFileSync(
      resolve(webRoot, "components/marketing/pricing-grid.tsx"),
      "utf8",
    );
    expect(grid).toContain("commercialPlansForPricingGrid");
    expect(grid).toContain("commercialPlanPublicCta");
    expect(grid).toContain("isCommercialSelfServeCheckoutEnabled");
    expect(grid).toContain("Activarea se face prin contact");
    expect(grid).toContain("COMMERCIAL_ENTERPRISE_CONTACT_HREF");
    expect(grid).not.toMatch(/149\s*lei/);
    expect(grid).not.toContain("commercialPlanSignupHref");
    expect(grid).not.toContain("ACME");
    expect(grid).not.toMatch(/self-checkout/i);
  });

  it("exposes pricing-grid plans without Enterprise card", () => {
    const codes = commercialPlansForPricingGrid().map((p) => p.code);
    expect(codes).toEqual(["plan_50", "business", "premium"]);
    expect(codes).not.toContain("enterprise");
  });

  it("builds an honest interest mailto with the visitor email", () => {
    const href = commercialInterestMailtoHref("dealer@showroom.ro");
    expect(href).toContain(`mailto:${COMMERCIAL_CONTACT_EMAIL}`);
    expect(href).toContain(encodeURIComponent("AUTOBEAR — Vreau să încep"));
    expect(href).toContain(encodeURIComponent("dealer@showroom.ro"));
  });
});

