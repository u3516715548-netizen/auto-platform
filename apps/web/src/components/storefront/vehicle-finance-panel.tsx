"use client";

import { useMemo, useState } from "react";
import { STOREFRONT_CONTACT_ANCHOR_ID } from "@/lib/storefront/storefront-contact-links";
import {
  calculateFixedMonthlyPayment,
  formatMonthlyPaymentEur,
  parsePriceEurNumber,
} from "@/lib/storefront/storefront-vehicle-lite";

type VehicleFinancePanelProps = {
  vehiclePrice: string;
  leadsEnabled: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Client-only financing estimate — no bank / DB. CTA focuses existing lead form when enabled.
 */
export function VehicleFinancePanel({ vehiclePrice, leadsEnabled }: VehicleFinancePanelProps) {
  const price = parsePriceEurNumber(vehiclePrice);
  const [downPayment, setDownPayment] = useState(() => Math.round(price * 0.2));
  const [months, setMonths] = useState(60);
  const [annualRate, setAnnualRate] = useState(4.9);

  const principal = Math.max(0, price - downPayment);
  const monthly = useMemo(
    () => calculateFixedMonthlyPayment(principal, annualRate, months),
    [principal, annualRate, months],
  );

  function onRequestOffer() {
    if (!leadsEnabled) return;
    const target = document.getElementById(STOREFRONT_CONTACT_ANCHOR_ID);
    if (!target) return;
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
    const heading = target.querySelector<HTMLElement>("#lead-form-heading");
    (heading ?? target).focus({ preventScroll: true });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="finance-heading">
      <div>
        <p className="sf-section-num" style={{ color: "#b45309" }}>
          01
        </p>
        <div className="mt-1 mb-2 h-0.5 w-8 rounded-full bg-[#b45309]" />
        <h2 id="finance-heading" className="text-xl font-bold text-[var(--sf-text)]">
          Finanțare
        </h2>
        <p className="mt-1 text-sm text-[var(--sf-text-muted)]">
          Plan de rate adaptat pentru mașina ta (estimare informativă).
        </p>
      </div>

      <div className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-white p-4 sm:p-5">
        <p className="flex items-center gap-2 rounded-[var(--sf-radius)] bg-[var(--sf-surface-muted)] px-3 py-2.5 text-sm text-[var(--sf-text)]">
          <span
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--sf-text)] text-xs font-bold text-white"
            aria-hidden
          >
            i
          </span>
          Dobândă estimativă de la {annualRate.toFixed(1).replace(".", ",")}% — calcul local, fără
          ofertă bancară.
        </p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sf-spec-tile">
            <dt className="text-[10px] font-semibold tracking-wide text-[var(--sf-text-muted)] uppercase">
              Preț vehicul
            </dt>
            <dd className="mt-1 text-sm font-bold text-[var(--sf-text)]">
              {formatMonthlyPaymentEur(price)}
            </dd>
          </div>
          <div className="sf-spec-tile">
            <dt className="text-[10px] font-semibold tracking-wide text-[var(--sf-text-muted)] uppercase">
              Rată lunară estimată
            </dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight text-[var(--sf-text)]">
              {formatMonthlyPaymentEur(monthly)}
              <span className="ml-1 text-sm font-medium text-[var(--sf-text-muted)]">/ lună</span>
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--sf-text)]">
              Avans: {formatMonthlyPaymentEur(downPayment)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, price)}
              step={100}
              value={Math.min(downPayment, price)}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="w-full accent-[var(--sf-accent)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--sf-text)]">Perioadă: {months} luni</span>
            <input
              type="range"
              min={12}
              max={84}
              step={6}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full accent-[var(--sf-accent)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--sf-text)]">
              Dobândă anuală: {annualRate.toFixed(1).replace(".", ",")}%
            </span>
            <input
              type="range"
              min={0}
              max={15}
              step={0.1}
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className="w-full accent-[var(--sf-accent)]"
            />
          </label>
        </div>

        {leadsEnabled ? (
          <button
            type="button"
            onClick={onRequestOffer}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
            style={{ backgroundColor: "var(--sf-accent)" }}
          >
            Cere ofertă de finanțare
          </button>
        ) : (
          <p className="mt-5 rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] px-3 py-3 text-sm text-[var(--sf-text-muted)]">
            Cererea de finanțare va fi activată ulterior. Contactează dealerul pentru o ofertă.
          </p>
        )}

        <p className="mt-3 text-xs leading-5 text-[var(--sf-text-muted)]">
          Ofertă informativă, neangajantă. Oferta finală se confirmă în showroom.
        </p>
      </div>
    </section>
  );
}
