/**
 * Commercial SaaS packages (Etapa 26) — product catalog for apex marketing UI.
 * Entitlement enforcement lives in 26B/26C; this module is display + CTA routing only.
 * Do not hardcode limits in React components — import from here.
 */

export type CommercialPlanCode = "plan_50" | "business" | "premium" | "enterprise";

export type CommercialPlan = {
  code: CommercialPlanCode;
  name: string;
  /** Max `available` vehicles; null = unlimited (reasonable use). */
  maxPublishedVehicles: number | null;
  /** Monthly price in RON; null = negotiated. */
  priceRonMonthly: number | null;
  priceLabel: string;
  blurb: string;
  highlights: readonly string[];
  selfServeCheckout: boolean;
  /** Featured card on pricing grid. */
  highlighted?: boolean;
};

/** Contact for Enterprise (no self-checkout in MVP). */
export const COMMERCIAL_ENTERPRISE_CONTACT_HREF =
  "mailto:contact@autofy.ro?subject=Auto%20Platform%20Enterprise";

export const COMMERCIAL_PLANS: readonly CommercialPlan[] = [
  {
    code: "plan_50",
    name: "50",
    maxPublishedVehicles: 50,
    priceRonMonthly: 149,
    priceLabel: "149 lei/lună",
    blurb: "Pentru showroom-uri mici care vor un stoc public curat.",
    highlights: ["50 mașini publicate", "Storefront pe subdomeniu", "Dashboard inventar & lead-uri"],
    selfServeCheckout: true,
  },
  {
    code: "business",
    name: "Business",
    maxPublishedVehicles: 150,
    priceRonMonthly: 299,
    priceLabel: "299 lei/lună",
    blurb: "Volum mai mare, același flux de publicare și lead-uri.",
    highlights: ["150 mașini publicate", "Filtre & finanțare pe storefront", "Echipă și roluri"],
    selfServeCheckout: true,
    highlighted: true,
  },
  {
    code: "premium",
    name: "Premium",
    maxPublishedVehicles: 500,
    priceRonMonthly: 599,
    priceLabel: "599 lei/lună",
    blurb: "Pentru dealeri cu stoc mare și ritm rapid de rotație.",
    highlights: ["500 mașini publicate", "Teme storefront", "Prioritate la onboarding"],
    selfServeCheckout: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    maxPublishedVehicles: null,
    priceRonMonthly: null,
    priceLabel: "Preț negociat",
    blurb: "Nelimitat, cu utilizare rezonabilă — configurare dedicată.",
    highlights: ["Stoc nelimitat*", "SLA și onboarding dedicat", "Fără self-checkout"],
    selfServeCheckout: false,
  },
] as const;

export function getCommercialPlan(code: CommercialPlanCode): CommercialPlan {
  const plan = COMMERCIAL_PLANS.find((p) => p.code === code);
  if (!plan) {
    throw new Error(`Unknown commercial plan: ${code}`);
  }
  return plan;
}

/** Auth-first CTA — checkout session is Etapa 26B. */
export function commercialPlanSignupHref(code: CommercialPlanCode): string {
  return `/login?plan=${encodeURIComponent(code)}`;
}

export function formatVehicleLimitRo(max: number | null): string {
  if (max === null) return "Nelimitat*";
  return `${max} mașini`;
}
