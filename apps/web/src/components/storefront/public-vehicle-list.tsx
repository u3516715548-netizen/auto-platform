import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicVehicleCatalogDto } from "@/lib/storefront/public-vehicles";
import { publicVehiclePath } from "@/lib/storefront/paths";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
} from "@/lib/storefront/public-vehicle-display";
import {
  VEHICLE_FUEL_LABELS_RO,
  VEHICLE_TRANSMISSION_LABELS_RO,
  VEHICLE_VAT_REGIME_LABELS_RO,
} from "@/lib/vehicles/vehicle-field-labels";
import { toStorefrontVehicleLite } from "@/lib/storefront/storefront-vehicle-lite";
import { VehicleCardRate } from "@/components/storefront/vehicle-card-rate";
import {
  VehicleCardCompareButton,
  VehicleListActions,
} from "@/components/storefront/vehicle-list-actions";
import { StorefrontMediaImage } from "@/components/storefront/storefront-media-image";

type PublicVehicleListProps = {
  vehicles: PublicVehicleCatalogDto[];
  /**
   * Demo / embedded preview: open vehicle in-place instead of navigating via Link.
   * Live storefront leaves this unset.
   */
  onSelectSlug?: (slug: string) => void;
  /** Flush first card under the catalog results toolbar (mobile). */
  attachToToolbar?: boolean;
};

function buildSpecLine(vehicle: PublicVehicleCatalogDto): string {
  const parts: string[] = [String(vehicle.year)];
  if (vehicle.fuel) parts.push(VEHICLE_FUEL_LABELS_RO[vehicle.fuel]);
  if (vehicle.powerHp != null && vehicle.powerHp > 0) {
    parts.push(`${vehicle.powerHp} CP`);
  } else if (vehicle.transmission) {
    parts.push(VEHICLE_TRANSMISSION_LABELS_RO[vehicle.transmission]);
  }
  return parts.join(" · ");
}

function CardNav({
  href,
  onSelectSlug,
  slug,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  onSelectSlug?: (slug: string) => void;
  slug: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  if (onSelectSlug) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => onSelectSlug(slug)}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    );
  }
  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}

/**
 * Template 1 catalog cards.
 * Actions sit outside the Link (no nested interactive elements) so navigation stays reliable.
 */
export function PublicVehicleList({
  vehicles,
  onSelectSlug,
  attachToToolbar = false,
}: PublicVehicleListProps) {
  return (
    <ul
      className={`grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 ${
        attachToToolbar ? "md:mt-3" : ""
      }`}
    >
      {vehicles.map((vehicle, index) => {
        const href = publicVehiclePath(vehicle.slug);
        const title = `${vehicle.make} ${vehicle.model}`;
        const vatLabel = vehicle.vatRegime
          ? VEHICLE_VAT_REGIME_LABELS_RO[vehicle.vatRegime]
          : null;
        const lite = toStorefrontVehicleLite(vehicle);
        const mileageTag = formatPublicVehicleMileage(vehicle);
        const transmissionTag = vehicle.transmission
          ? VEHICLE_TRANSMISSION_LABELS_RO[vehicle.transmission]
          : null;
        const flushTop = attachToToolbar && index === 0;

        return (
          <li key={vehicle.slug} className="min-w-0">
            <article
              className={`sf-solid-card group relative flex h-full flex-col overflow-hidden border border-[var(--sf-border)] ${
                flushTop
                  ? "rounded-b-[var(--sf-radius-lg)] rounded-t-none md:rounded-[var(--sf-radius-lg)]"
                  : "rounded-[var(--sf-radius-lg)]"
              }`}
            >
              <div
                className={`relative aspect-[4/3] w-full overflow-hidden bg-[var(--sf-surface-muted)] ${
                  flushTop
                    ? "rounded-t-none md:rounded-t-[var(--sf-radius-lg)]"
                    : "rounded-t-[var(--sf-radius-lg)]"
                }`}
              >
                <CardNav
                  href={href}
                  onSelectSlug={onSelectSlug}
                  slug={vehicle.slug}
                  className={
                    onSelectSlug
                      ? "absolute inset-0 block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                      : "absolute inset-0 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                  }
                  ariaLabel={title}
                >
                  <StorefrontMediaImage
                    src={vehicle.coverImage?.url ?? ""}
                    alt={vehicle.coverImage?.altText ?? title}
                    className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02] motion-reduce:transition-none"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={index === 0}
                    fallback={
                      <span className="flex h-full items-center justify-center text-sm text-[var(--sf-text-muted)]">
                        Imagine indisponibilă
                      </span>
                    }
                  />
                </CardNav>
                {vehicle.condition === "new" ? (
                  <span
                    className="pointer-events-none absolute top-3 left-3 z-[1] rounded-md px-2 py-1 text-[11px] font-bold tracking-wide text-white uppercase"
                    style={{ backgroundColor: "var(--sf-accent)" }}
                  >
                    Nou
                  </span>
                ) : null}
                <VehicleListActions vehicle={lite} variant="card" />
              </div>

              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <CardNav
                  href={href}
                  onSelectSlug={onSelectSlug}
                  slug={vehicle.slug}
                  className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                >
                  <h3 className="text-lg font-bold tracking-tight text-[var(--sf-text)]">
                    {title}
                  </h3>
                </CardNav>

                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tracking-tight text-[var(--sf-text)]">
                      {formatPublicVehiclePrice(vehicle)}
                    </p>
                    {vatLabel ? (
                      <p className="text-xs font-semibold tracking-wide text-[var(--sf-success)] uppercase">
                        {vatLabel}
                      </p>
                    ) : null}
                  </div>
                  <VehicleCardRate price={vehicle.price} />
                </div>

                {vehicle.priceNegotiable ? (
                  <p className="text-xs font-medium" style={{ color: "var(--sf-accent)" }}>
                    Preț negociabil
                  </p>
                ) : null}

                <CardNav
                  href={href}
                  onSelectSlug={onSelectSlug}
                  slug={vehicle.slug}
                  className="text-left text-sm text-[var(--sf-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                >
                  {buildSpecLine(vehicle)}
                </CardNav>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--sf-surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--sf-text)]">
                      {mileageTag}
                    </span>
                    {transmissionTag ? (
                      <span className="rounded-full bg-[var(--sf-surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--sf-text)]">
                        {transmissionTag}
                      </span>
                    ) : null}
                  </div>
                  <VehicleCardCompareButton vehicle={lite} />
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
