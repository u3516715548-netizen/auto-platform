import Link from "next/link";
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
import { VehicleListActions } from "@/components/storefront/vehicle-list-actions";

type PublicVehicleListProps = {
  vehicles: PublicVehicleCatalogDto[];
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

function buildTags(vehicle: PublicVehicleCatalogDto): string[] {
  const tags: string[] = [formatPublicVehicleMileage(vehicle)];
  if (vehicle.transmission) {
    tags.push(VEHICLE_TRANSMISSION_LABELS_RO[vehicle.transmission]);
  }
  if (vehicle.locationCity) {
    tags.push(vehicle.locationCity);
  }
  return tags;
}

/**
 * Template 1 catalog cards.
 * Actions sit outside the Link (no nested interactive elements) so navigation stays reliable.
 */
export function PublicVehicleList({ vehicles }: PublicVehicleListProps) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      {vehicles.map((vehicle) => {
        const href = publicVehiclePath(vehicle.slug);
        const title = `${vehicle.make} ${vehicle.model}`;
        const tags = buildTags(vehicle);
        const vatLabel = vehicle.vatRegime
          ? VEHICLE_VAT_REGIME_LABELS_RO[vehicle.vatRegime]
          : null;
        const lite = toStorefrontVehicleLite(vehicle);

        return (
          <li key={vehicle.slug} className="min-w-0">
            <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--sf-radius-lg)] bg-white">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--sf-radius-lg)] bg-[var(--sf-surface-muted)]">
                <Link
                  href={href}
                  className="absolute inset-0 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
                  aria-label={title}
                >
                  {vehicle.coverImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vehicle.coverImage.url}
                      alt={vehicle.coverImage.altText ?? title}
                      className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02] motion-reduce:transition-none"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-sm text-[var(--sf-text-muted)]">
                      Imagine indisponibilă
                    </span>
                  )}
                </Link>
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

              <Link
                href={href}
                className="flex flex-1 flex-col gap-1.5 pt-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
              >
                <h3 className="text-lg font-bold tracking-tight text-[var(--sf-text)]">
                  {title}
                </h3>

                <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                  <p className="text-2xl font-bold tracking-tight text-[var(--sf-text)]">
                    {formatPublicVehiclePrice(vehicle)}
                  </p>
                  {vatLabel ? (
                    <p className="pb-0.5 text-xs font-semibold tracking-wide text-[var(--sf-success)] uppercase">
                      {vatLabel}
                    </p>
                  ) : null}
                </div>

                {vehicle.priceNegotiable ? (
                  <p className="text-xs font-medium" style={{ color: "var(--sf-accent)" }}>
                    Preț negociabil
                  </p>
                ) : null}

                <p className="text-sm text-[var(--sf-text-muted)]">{buildSpecLine(vehicle)}</p>

                {tags.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--sf-surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--sf-text)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Link>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
