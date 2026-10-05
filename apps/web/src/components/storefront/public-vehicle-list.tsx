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
} from "@/lib/vehicles/vehicle-field-labels";

type PublicVehicleListProps = {
  vehicles: PublicVehicleCatalogDto[];
};

function buildMetaLine(vehicle: PublicVehicleCatalogDto): string {
  const parts: string[] = [
    formatPublicVehiclePrice(vehicle),
    formatPublicVehicleMileage(vehicle),
    String(vehicle.year),
  ];
  if (vehicle.fuel) parts.push(VEHICLE_FUEL_LABELS_RO[vehicle.fuel]);
  if (vehicle.transmission) parts.push(VEHICLE_TRANSMISSION_LABELS_RO[vehicle.transmission]);
  return parts.join(" · ");
}

/**
 * Template 1 catalog cards — single navigable surface per vehicle (no nested links).
 */
export function PublicVehicleList({ vehicles }: PublicVehicleListProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      {vehicles.map((vehicle) => {
        const href = publicVehiclePath(vehicle.slug);
        const title = `${vehicle.make} ${vehicle.model}`;
        return (
          <li key={vehicle.slug} className="min-w-0">
            <Link
              href={href}
              className="group flex h-full flex-col overflow-hidden rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sm transition-[box-shadow,transform,border-color] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md motion-reduce:transition-none hover:border-[color-mix(in_srgb,var(--sf-accent)_35%,var(--sf-border))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)]"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-[color-mix(in_srgb,var(--sf-border)_55%,var(--sf-surface))]">
                {vehicle.coverImage?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={vehicle.coverImage.url}
                    alt={vehicle.coverImage.altText ?? title}
                    className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02] motion-reduce:transition-none"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--sf-text-muted)]">
                    Fără imagine
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4 sm:p-4.5">
                <h3 className="text-base font-semibold tracking-tight text-[var(--sf-text)]">
                  {title}
                </h3>
                <p className="text-lg font-bold tracking-tight text-[var(--sf-text)]">
                  {formatPublicVehiclePrice(vehicle)}
                </p>
                <p className="text-sm leading-5 text-[var(--sf-text-muted)]">{buildMetaLine(vehicle)}</p>
                <span
                  className="mt-auto inline-flex min-h-11 items-center pt-2 text-sm font-semibold"
                  style={{ color: "var(--sf-accent)" }}
                >
                  Vezi detalii
                  <span aria-hidden="true" className="ml-1 transition-transform motion-safe:group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
