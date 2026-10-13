import Link from "next/link";
import {
  COMMERCIAL_PLANS,
  commercialPlanPublicCta,
  formatVehicleLimitRo,
  isCommercialSelfServeCheckoutEnabled,
  type CommercialPlan,
} from "@/lib/marketing/commercial-plans";

type PricingGridProps = {
  /** When true, render as the main pricing page section (larger heading). */
  pageMode?: boolean;
};

function PlanCta({ plan }: { plan: CommercialPlan }) {
  const cta = commercialPlanPublicCta(plan);

  if (cta.kind === "contact") {
    return (
      <a href={cta.href} className="saas-btn-ghost !min-h-11 w-full !normal-case !tracking-wide">
        {cta.label}
      </a>
    );
  }

  return (
    <Link
      href={cta.href}
      className={
        plan.highlighted
          ? "saas-btn-primary !min-h-11 w-full !normal-case !tracking-wide"
          : "saas-btn-ghost !min-h-11 w-full !normal-case !tracking-wide !border-white/20 !text-white hover:!border-[var(--saas-neon)] hover:!text-[var(--saas-neon)]"
      }
    >
      {cta.label}
    </Link>
  );
}

export function PricingGrid({ pageMode = false }: PricingGridProps) {
  const selfServeOn = isCommercialSelfServeCheckoutEnabled();

  return (
    <section
      id="preturi"
      className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20"
      aria-labelledby="pricing-heading"
    >
      <div className="max-w-2xl">
        <p className="text-[0.7rem] font-bold tracking-[0.16em] text-[var(--saas-neon)] uppercase">
          Planuri
        </p>
        <h2
          id="pricing-heading"
          className={`mt-3 font-semibold tracking-tight text-white ${
            pageMode ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
          }`}
          style={{ fontFamily: "var(--font-saas-display), ui-sans-serif, system-ui, sans-serif" }}
        >
          Alege volumul de stoc publicat
        </h2>
        <p className="mt-3 text-base leading-7 text-white/60">
          Prețuri lunare în RON. TVA și facturare se confirmă la contract.{" "}
          {selfServeOn
            ? "Checkout-ul urmează după autentificare."
            : "Self-checkout este temporar dezactivat — contactează-ne pentru activare."}
        </p>
      </div>

      <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {COMMERCIAL_PLANS.map((plan) => (
          <li
            key={plan.code}
            data-plan-code={plan.code}
            className={`flex flex-col p-5 ${
              plan.highlighted ? "saas-card-featured rounded-[var(--saas-radius)]" : "saas-card"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3
                className="text-xl font-semibold text-white"
                style={{ fontFamily: "var(--font-saas-display), ui-sans-serif, system-ui, sans-serif" }}
              >
                {plan.name}
              </h3>
              {plan.highlighted ? (
                <span className="rounded-full border border-[var(--saas-border-neon)] bg-[var(--saas-neon-dim)] px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-[var(--saas-neon)] uppercase">
                  Popular
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--saas-neon)]">
              {plan.priceLabel}
            </p>
            <p className="mt-1 text-sm text-white/45">
              {formatVehicleLimitRo(plan.maxPublishedVehicles)} publicate
            </p>
            <p className="mt-3 flex-1 text-sm leading-6 text-white/65">{plan.blurb}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-white/70">
              {plan.highlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-[var(--saas-neon)]">
                    ·
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <PlanCta plan={plan} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs leading-5 text-white/35">
        * Enterprise: utilizare rezonabilă, fără self-checkout. Nu modifică inventarul demo ACME.
      </p>
    </section>
  );
}
