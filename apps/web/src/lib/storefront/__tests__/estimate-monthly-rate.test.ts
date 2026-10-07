import { describe, expect, it } from "vitest";
import {
  ESTIMATE_MONTHLY_RATE_MONTHS,
  estimateMonthlyRateEur,
  formatEstimateMonthlyRateEur,
} from "../storefront-vehicle-lite";

describe("estimateMonthlyRateEur", () => {
  it("divides price by 60 and rounds to whole EUR", () => {
    expect(ESTIMATE_MONTHLY_RATE_MONTHS).toBe(60);
    expect(estimateMonthlyRateEur("28900")).toBe(482);
    expect(estimateMonthlyRateEur(28900)).toBe(482);
    expect(estimateMonthlyRateEur("19990")).toBe(333);
    expect(estimateMonthlyRateEur(100)).toBe(2);
  });

  it("returns null without a public price", () => {
    expect(estimateMonthlyRateEur(null)).toBeNull();
    expect(estimateMonthlyRateEur(undefined)).toBeNull();
    expect(estimateMonthlyRateEur("")).toBeNull();
    expect(estimateMonthlyRateEur("0")).toBeNull();
    expect(estimateMonthlyRateEur(-10)).toBeNull();
    expect(estimateMonthlyRateEur("abc")).toBeNull();
  });

  it("formats rate label in Romanian EUR/lună", () => {
    expect(formatEstimateMonthlyRateEur(482)).toBe("482 EUR/lună");
    expect(formatEstimateMonthlyRateEur(1500)).toBe("1.500 EUR/lună");
  });
});
