import {
  ESTIMATE_MONTHLY_RATE_NOTE,
  estimateMonthlyRateEur,
  formatEstimateMonthlyRateEur,
} from "@/lib/storefront/storefront-vehicle-lite";

type VehicleCardRateProps = {
  price: string;
  className?: string;
};

/**
 * Discrete “Rate de la” estimate for catalog cards (price ÷ 60).
 */
export function VehicleCardRate({ price, className = "" }: VehicleCardRateProps) {
  const monthly = estimateMonthlyRateEur(price);
  if (monthly == null) return null;

  return (
    <div className={`min-w-0 text-right ${className}`}>
      <p className="text-[11px] font-medium tracking-wide text-[var(--sf-text-muted)] uppercase">
        Rate de la
      </p>
      <p className="text-sm font-semibold text-[var(--sf-text)] tabular-nums">
        {formatEstimateMonthlyRateEur(monthly)}
        <span className="text-[var(--sf-text-muted)]" title={ESTIMATE_MONTHLY_RATE_NOTE}>
          *
        </span>
      </p>
      <span className="sr-only">{ESTIMATE_MONTHLY_RATE_NOTE}</span>
    </div>
  );
}
