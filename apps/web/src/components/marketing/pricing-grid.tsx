import Link from "next/link";
import {
  COMMERCIAL_ENTERPRISE_CONTACT_HREF,
  COMMERCIAL_PLANS,
  commercialPlanSignupHref,
  formatVehicleLimitRo,
  type CommercialPlan,
} from "@/lib/marketing/commercial-plans";

type PricingGridProps = {
  /** When true, render as the main pricing page section (larger heading). */
  pageMode?: boolean;
};

function PlanCta({ plan }: { plan: CommercialPlan }) {
  if (!plan.selfServeCheckout) {
    return (
      <a
        href={COMMERCIAL_ENTERPRISE_CONTACT_HREF}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-teal-200/40 bg-transparent px-4 py-2.5 text-sm font-semibold text-teal-50 transition hover:bg-white/10"
      >
        Contactează-ne
      </a>
    );
  }

  return (
    <Link
      href={commercialPlanSignupHref(plan.code)}
      className={`inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition ${
        plan.highlighted
          ? "bg-teal-400 text-teal-950 hover:bg-teal-300"
          : "bg-white text-[var(--saas-ink)] hover:bg-teal-50"
      }`}
    >
      Începe cu {plan.name}
    </Link>
  );
}

export function PricingGrid({ pageMode = false }: PricingGridProps) {
  return (
    <section
      id="preturi"
      className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20"
      aria-labelledby="pricing-heading"
    >
      <div className="max-w-2xl">
        <p className="text-sm font-semibold tracking-wide text-teal-300 uppercase">Planuri</p>
        <h2
          id="pricing-heading"
          className={`mt-2 font-semibold tracking-tight text-white ${
            pageMode ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
          }`}
          style={{ fontFamily: "var(--font-saas-display), Georgia, serif" }}
        >
          Alege volumul de stoc publicat
        </h2>
        <p className="mt-3 text-base leading-7 text-teal-50/75">
          Prețuri lunare în RON. TVA și facturare se confirmă la contract. Checkout-ul urmează după
          autentificare.
        </p>
      </div>

      <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {COMMERCIAL_PLANS.map((plan) => (
          <li
            key={plan.code}
            data-plan-code={plan.code}
            className={`flex flex-col rounded-2xl border p-5 ${
              plan.highlighted
                ? "border-teal-300/50 bg-[color-mix(in_srgb,teal_18%,var(--saas-ink))] shadow-[0_0_0_1px_rgba(45,212,191,0.25)]"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3
                className="text-xl font-semibold text-white"
                style={{ fontFamily: "var(--font-saas-display), Georgia, serif" }}
              >
                {plan.name}
              </h3>
              {plan.highlighted ? (
                <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-xs font-semibold text-teal-200">
                  Popular
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-teal-200">
              {plan.priceLabel}
            </p>
            <p className="mt-1 text-sm text-teal-100/70">
              {formatVehicleLimitRo(plan.maxPublishedVehicles)} publicate
            </p>
            <p className="mt-3 flex-1 text-sm leading-6 text-teal-50/80">{plan.blurb}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-teal-50/85">
              {plan.highlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-teal-300">
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
      <p className="mt-6 text-xs leading-5 text-teal-100/50">
        * Enterprise: utilizare rezonabilă, fără self-checkout. Nu modifică inventarul demo ACME.
      </p>
    </section>
  );
}
