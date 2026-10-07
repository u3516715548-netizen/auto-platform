"use client";

import { useMemo, useState } from "react";
import {
  calculateFixedMonthlyPayment,
  formatMonthlyPaymentEur,
  parsePriceEurNumber,
} from "@/lib/storefront/storefront-vehicle-lite";

type VehicleFinancePanelProps = {
  vehiclePrice: string;
  leadsEnabled: boolean;
};

const PERIODS = [
  { months: 12, label: "1 an" },
  { months: 24, label: "2 ani" },
  { months: 36, label: "3 ani" },
  { months: 48, label: "4 ani" },
  { months: 60, label: "5 ani" },
] as const;

const ANNUAL_RATE = 4.9;

const CONSENT_TEXT =
  "Sunt de acord cu prelucrarea datelor mele cu caracter personal (Vezi mai multe în politica de confidențialitate).";

type ApplicantType = "individual" | "company";

/**
 * Financing: amount slider 0→car price (default max), period chips, Aplică acum → popup.
 * No DB / bank.
 */
export function VehicleFinancePanel({ vehiclePrice, leadsEnabled }: VehicleFinancePanelProps) {
  const price = Math.max(0, Math.round(parsePriceEurNumber(vehiclePrice)));
  const [amount, setAmount] = useState(price);
  const [months, setMonths] = useState(60);
  const [open, setOpen] = useState(false);
  const [applicant, setApplicant] = useState<ApplicantType>("individual");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  const safeAmount = Math.min(Math.max(0, amount), price || amount);
  const monthly = useMemo(
    () => calculateFixedMonthlyPayment(safeAmount, ANNUAL_RATE, months),
    [safeAmount, months],
  );

  return (
    <section className="flex flex-col gap-4" aria-labelledby="finance-heading">
      <div className="flex items-start gap-3 sm:gap-4">
        <p className="sf-section-num shrink-0 tabular-nums" style={{ color: "#b45309" }} aria-hidden>
          01
        </p>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 id="finance-heading" className="text-xl font-bold tracking-tight text-[var(--sf-text)]">
            <span className="sr-only">01. </span>
            Finanțare plan rate
          </h2>
          <p className="mt-1 text-sm text-[var(--sf-text-muted)]">
            Calculează o estimare lunară pentru acest vehicul.
          </p>
        </div>
      </div>

      <div className="sf-solid-card rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] p-4 text-left sm:p-5">
        <p className="text-center text-sm font-medium text-[var(--sf-text)]">
          Am nevoie de suma de
        </p>
        <div className="mt-3 flex min-h-14 items-center rounded-xl border border-[var(--sf-border)] bg-white px-3">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={price || undefined}
            step={100}
            value={safeAmount}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              setAmount(Math.min(Math.max(0, n), price || n));
            }}
            className="min-h-12 w-full min-w-0 flex-1 border-0 bg-transparent text-2xl font-bold text-[var(--sf-text)] outline-none"
            aria-label="Sumă finanțată"
          />
          <span className="shrink-0 text-sm font-semibold">EUR</span>
        </div>
        {price > 0 ? (
          <input
            type="range"
            min={0}
            max={price}
            step={100}
            value={safeAmount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--sf-accent)]"
            aria-label="Ajustează suma (maxim prețul mașinii)"
          />
        ) : null}

        <p className="mt-5 text-center text-sm font-medium text-[var(--sf-text)]">
          Voi returna suma în
        </p>
        <ul className="mt-3 grid grid-cols-5 gap-1.5">
          {PERIODS.map((period) => {
            const selected = months === period.months;
            return (
              <li key={period.months}>
                <button
                  type="button"
                  onClick={() => setMonths(period.months)}
                  aria-pressed={selected}
                  className={`flex min-h-[4.25rem] w-full flex-col items-center justify-center rounded-xl border px-1 ${
                    selected
                      ? "border-[var(--sf-accent)] text-[var(--sf-accent)]"
                      : "border-[var(--sf-border)] text-[var(--sf-text)]"
                  }`}
                  style={
                    selected
                      ? {
                          backgroundColor:
                            "color-mix(in srgb, var(--sf-accent) 10%, white)",
                        }
                      : { backgroundColor: "#fff" }
                  }
                >
                  <span className="text-base font-bold">{period.months}</span>
                  <span className="text-[10px] text-[var(--sf-text-muted)]">{period.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-center text-sm text-[var(--sf-text-muted)]">
          Rată estimată:{" "}
          <span className="font-bold text-[var(--sf-text)]">
            {formatMonthlyPaymentEur(monthly)} / lună
          </span>
        </p>

        <button
          type="button"
          onClick={() => {
            setSent(false);
            setConsent(false);
            setOpen(true);
          }}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: "var(--sf-accent)" }}
        >
          Aplică acum
        </button>
        <p className="mt-3 text-center text-xs text-[var(--sf-text-muted)]">
          Ofertă informativă, neangajantă. Oferta finală se confirmă în showroom.
        </p>
      </div>

      {open ? (
        <FinanceApplyDialog
          applicant={applicant}
          setApplicant={setApplicant}
          consent={consent}
          setConsent={setConsent}
          sent={sent}
          setSent={setSent}
          leadsEnabled={leadsEnabled}
          amountLabel={formatMonthlyPaymentEur(safeAmount)}
          months={months}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </section>
  );
}

function FinanceApplyDialog({
  applicant,
  setApplicant,
  consent,
  setConsent,
  sent,
  setSent,
  leadsEnabled,
  amountLabel,
  months,
  onClose,
}: {
  applicant: ApplicantType;
  setApplicant: (v: ApplicantType) => void;
  consent: boolean;
  setConsent: (v: boolean) => void;
  sent: boolean;
  setSent: (v: boolean) => void;
  leadsEnabled: boolean;
  amountLabel: string;
  months: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center text-left sm:items-center">
      <button type="button" className="absolute inset-0 bg-zinc-900/45" aria-label="Închide" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cerere de finanțare"
        className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--sf-border)] bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--sf-border)] px-4 py-3">
          <h3 className="text-base font-bold">Cerere de finanțare</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--sf-border)] text-xl"
            aria-label="Închide"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">
          {sent ? (
            <p className="rounded-xl bg-[var(--sf-surface-muted)] px-3 py-4 text-sm">
              {leadsEnabled
                ? "Cererea a fost înregistrată local. Completează și formularul de contact de pe pagină."
                : "Cerere informativă. Contactează dealerul pentru o ofertă."}
            </p>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!consent) return;
                setSent(true);
              }}
            >
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--sf-surface-muted)] p-1">
                {(
                  [
                    ["individual", "Persoană fizică"],
                    ["company", "Firmă"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setApplicant(key)}
                    className="min-h-11 rounded-lg text-sm font-semibold text-white"
                    style={{
                      backgroundColor:
                        applicant === key ? "var(--sf-accent)" : "transparent",
                      color: applicant === key ? "#fff" : "var(--sf-text)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {applicant === "individual" ? (
                <>
                  <TextField label="Prenumele*" name="firstName" placeholder="Introdu prenumele" />
                  <TextField
                    label="Numele de familie*"
                    name="lastName"
                    placeholder="Introdu numele de familie"
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="Denumire firmă*"
                    name="company"
                    placeholder="Introdu denumirea firmei"
                  />
                  <TextField label="CUI*" name="cui" placeholder="Introdu CUI" />
                </>
              )}
              <TextField
                label="Adresa de email*"
                name="email"
                type="email"
                placeholder="Introdu adresa ta de e-mail"
              />
              <TextField
                label="Număr de telefon*"
                name="phone"
                type="tel"
                placeholder="Introdu numărul tău de telefon"
              />
              <label className="flex items-start gap-3 text-sm leading-5">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-5"
                />
                <span>{CONSENT_TEXT}</span>
              </label>
              <dl className="space-y-2 border-t border-[var(--sf-border)] pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--sf-text-muted)]">Sumă împrumutată</dt>
                  <dd className="font-bold">{amountLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--sf-text-muted)]">Perioadă</dt>
                  <dd className="font-bold">{months} luni</dd>
                </div>
              </dl>
              <button
                type="submit"
                disabled={!consent}
                className="min-h-12 rounded-full text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--sf-accent)" }}
              >
                Trimite cererea
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  name,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="min-h-11 rounded-lg border border-[var(--sf-border)] px-3 text-sm outline-none focus:border-[var(--sf-accent)]"
      />
    </div>
  );
}
