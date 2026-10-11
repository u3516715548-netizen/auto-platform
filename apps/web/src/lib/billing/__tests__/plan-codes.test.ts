import { describe, expect, it } from "vitest";
import {
  checkoutPath,
  isReservedTenantSlug,
  isSelfServePlanCode,
  isValidTenantSlug,
  maxPublishedForPlan,
  parseSelfServePlanCode,
} from "@/lib/billing/plan-codes";

describe("billing plan-codes (Etapa 26B)", () => {
  it("accepts only self-serve plans", () => {
    expect(isSelfServePlanCode("plan_50")).toBe(true);
    expect(isSelfServePlanCode("business")).toBe(true);
    expect(isSelfServePlanCode("premium")).toBe(true);
    expect(isSelfServePlanCode("enterprise")).toBe(false);
    expect(parseSelfServePlanCode("Business")).toBe("business");
    expect(parseSelfServePlanCode("enterprise")).toBeNull();
  });

  it("exposes catalog limits without hardcoding in callers", () => {
    expect(maxPublishedForPlan("plan_50")).toBe(50);
    expect(maxPublishedForPlan("business")).toBe(150);
    expect(maxPublishedForPlan("premium")).toBe(500);
    expect(maxPublishedForPlan("enterprise")).toBeNull();
  });

  it("validates and reserves tenant slugs", () => {
    expect(isValidTenantSlug("auto-premium")).toBe(true);
    expect(isValidTenantSlug("a")).toBe(false);
    expect(isValidTenantSlug("-bad")).toBe(false);
    expect(isReservedTenantSlug("acme")).toBe(true);
    expect(isReservedTenantSlug("www")).toBe(true);
    expect(isReservedTenantSlug("checkout")).toBe(true);
    expect(isReservedTenantSlug("auto-premium")).toBe(false);
  });

  it("builds checkout path with plan query", () => {
    expect(checkoutPath("plan_50")).toBe("/checkout?plan=plan_50");
  });
});
