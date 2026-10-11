import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_PLANS,
  commercialPlanSignupHref,
  formatVehicleLimitRo,
  getCommercialPlan,
} from "@/lib/marketing/commercial-plans";

const webRoot = resolve(__dirname, "../../..");

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

  it("routes self-serve CTAs through auth-first login with plan query", () => {
    expect(commercialPlanSignupHref("business")).toBe("/login?plan=business");
    expect(formatVehicleLimitRo(50)).toBe("50 mașini");
    expect(formatVehicleLimitRo(null)).toBe("Nelimitat*");
  });

  it("keeps plan limits in the shared module (not hardcoded in pricing UI)", () => {
    const grid = readFileSync(
      resolve(webRoot, "components/marketing/pricing-grid.tsx"),
      "utf8",
    );
    expect(grid).toContain("COMMERCIAL_PLANS");
    expect(grid).toContain("Contactează-ne");
    expect(grid).not.toMatch(/149\s*lei/);
    expect(grid).toContain("commercialPlanSignupHref");
  });
});
