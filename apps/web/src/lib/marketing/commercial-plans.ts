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

/**
 * Public contact inbox for plan activation CTAs.
 * Inbox `contact@autobear.ro` is not wired in-repo yet — keep working autofy fallback.
 */
export const COMMERCIAL_CONTACT_EMAIL = "contact@autofy.ro";

/** @deprecated Prefer commercialPlanContactHref(plan) for plan-specific subjects. */
export const COMMERCIAL_ENTERPRISE_CONTACT_HREF = commercialPlanContactHrefName("Enterprise");

function commercialPlanContactHrefName(planName: string): string {
  const subject = encodeURIComponent(`AUTOBEAR — Plan ${planName}`);
  return `mailto:${COMMERCIAL_CONTACT_EMAIL}?subject=${subject}`;
}

export function commercialPlanContactHref(plan: CommercialPlan): string {
  return commercialPlanContactHrefName(plan.name);
}

export const COMMERCIAL_PLANS: readonly CommercialPlan[] = [
  {
    code: "plan_50",
    name: "50",
    maxPublishedVehicles: 50,
    priceRonMonthly: 149,
    priceLabel: "149 lei/lună",
    blurb: "Pentru showroom-uri mici care vor un stoc public curat.",
    highlights: [
      "50 mașini publicate",
      "Site pe adresa ta",
      "Inventar și cereri de la clienți",
    ],
    selfServeCheckout: true,
  },
  {
    code: "business",
    name: "Business",
    maxPublishedVehicles: 150,
    priceRonMonthly: 299,
    priceLabel: "299 lei/lună",
    blurb: "Volum mai mare, același flux simplu de publicare și cereri.",
    highlights: [
      "150 mașini publicate",
      "Filtre pe site și cereri de finanțare",
      "Echipă și roluri",
    ],
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
    highlights: [
      "500 mașini publicate",
      "Aspect personalizabil",
      "Pornire asistată, cu prioritate",
    ],
    selfServeCheckout: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    maxPublishedVehicles: null,
    priceRonMonthly: null,
    priceLabel: "Preț negociat",
    blurb: "Stoc nelimitat, cu utilizare rezonabilă — configurare dedicată.",
    highlights: [
      "Stoc nelimitat*",
      "Suport dedicat și pornire ghidată",
      "Activare pe contract",
    ],
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

/** Auth-first CTA — checkout session is Etapa 26B (only when public self-serve is on). */
export function commercialPlanSignupHref(code: CommercialPlanCode): string {
  return `/login?plan=${encodeURIComponent(code)}`;
}

function envFlagOn(value: string | undefined): boolean {
  const raw = value?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}

function envNonEmpty(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

/**
 * True only when Stripe self-serve prices + secrets are present.
 * Used together with the explicit commercial opt-in flag (both required).
 */
export function isStripePublicCheckoutConfigured(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): boolean {
  if ((env.PAYMENT_PROVIDER ?? "").trim().toLowerCase() !== "stripe") {
    return false;
  }
  return (
    envNonEmpty(env.STRIPE_SECRET_KEY) &&
    envNonEmpty(env.STRIPE_WEBHOOK_SECRET) &&
    envNonEmpty(env.STRIPE_PRICE_PLAN_50) &&
    envNonEmpty(env.STRIPE_PRICE_BUSINESS) &&
    envNonEmpty(env.STRIPE_PRICE_PREMIUM)
  );
}

/**
 * Pre-launch: public self-serve checkout is OFF unless BOTH:
 * 1) COMMERCIAL_SELF_SERVE_CHECKOUT=1|true (explicit owner opt-in), AND
 * 2) PAYMENT_PROVIDER=stripe with secret, webhook secret, and all three Price IDs.
 * Flag alone or noop/Stripe-incomplete never opens public CTAs /checkout.
 */
export function isCommercialSelfServeCheckoutEnabled(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): boolean {
  if (!envFlagOn(env.COMMERCIAL_SELF_SERVE_CHECKOUT)) {
    return false;
  }
  return isStripePublicCheckoutConfigured(env);
}

export type CommercialPlanPublicCta = {
  kind: "checkout" | "contact";
  href: string;
  label: string;
};

/** Public pricing CTA — contact-only when self-serve is disabled. */
export function commercialPlanPublicCta(plan: CommercialPlan): CommercialPlanPublicCta {
  if (plan.selfServeCheckout && isCommercialSelfServeCheckoutEnabled()) {
    return {
      kind: "checkout",
      href: commercialPlanSignupHref(plan.code),
      label: `Începe cu ${plan.name}`,
    };
  }
  return {
    kind: "contact",
    href: commercialPlanContactHref(plan),
    label: `Scrie-ne pentru ${plan.name}`,
  };
}

export function formatVehicleLimitRo(max: number | null): string {
  if (max === null) return "Nelimitat*";
  return `${max} mașini`;
}
