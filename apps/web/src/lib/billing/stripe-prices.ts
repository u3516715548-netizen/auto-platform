import type { SelfServePlanCode } from "@/lib/billing/plan-codes";

/** Server-only Stripe Price ids — never NEXT_PUBLIC_*. */
export function stripePriceIdForPlan(plan: SelfServePlanCode): string | null {
  const map: Record<SelfServePlanCode, string | undefined> = {
    plan_50: process.env.STRIPE_PRICE_PLAN_50?.trim(),
    business: process.env.STRIPE_PRICE_BUSINESS?.trim(),
    premium: process.env.STRIPE_PRICE_PREMIUM?.trim(),
  };
  const id = map[plan];
  return id && id.length > 0 ? id : null;
}
