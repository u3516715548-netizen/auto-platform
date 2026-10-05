import type { PublicVehicleDto } from "@/lib/storefront/public-dto";
import type { PublicVehicleImageDto } from "@/lib/storefront/public-gallery-helpers";
import {
  buildPublicVehicleDetailSections,
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
} from "@/lib/storefront/public-vehicle-display";
import {
  VEHICLE_BODY_TYPE_LABELS_RO,
  VEHICLE_FUEL_LABELS_RO,
  VEHICLE_TRANSMISSION_LABELS_RO,
} from "@/lib/vehicles/vehicle-field-labels";
import { PublicVehicleGallery } from "./public-vehicle-gallery";

type PublicVehicleDetailProps = {
  vehicle: PublicVehicleDto;
  images?: PublicVehicleImageDto[];
  accent?: string | null;
};

type Highlight = { label: string; value: string };

function buildHighlights(vehicle: PublicVehicleDto): Highlight[] {
  const items: Highlight[] = [
    { label: "An", value: String(vehicle.year) },
    { label: "Kilometraj", value: formatPublicVehicleMileage(vehicle) },
  ];
  if (vehicle.fuel) {
    items.push({ label: "Combustibil", value: VEHICLE_FUEL_LABELS_RO[vehicle.fuel] });
  }
  if (vehicle.transmission) {
    items.push({
      label: "Transmisie",
      value: VEHICLE_TRANSMISSION_LABELS_RO[vehicle.transmission],
    });
  }
  if (vehicle.bodyType) {
    items.push({ label: "Caroserie", value: VEHICLE_BODY_TYPE_LABELS_RO[vehicle.bodyType] });
  }
  if (vehicle.powerHp != null && vehicle.powerHp > 0) {
    items.push({ label: "Putere", value: `${vehicle.powerHp} CP` });
  }
  return items;
}

/**
 * Template 1 vehicle detail — gallery dominant, clear hierarchy; E7 gallery contract unchanged.
 */
export function PublicVehicleDetail({ vehicle, images = [], accent }: PublicVehicleDetailProps) {
  const sections = buildPublicVehicleDetailSections(vehicle);
  const color = accent ?? "var(--sf-accent)";
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;
  const highlights = buildHighlights(vehicle);

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      <PublicVehicleGallery
        key={images.map((img) => `${img.sortOrder}:${img.url ?? "x"}`).join("|")}
        images={images}
        vehicleLabel={vehicleLabel}
        accent={accent}
      />

      <header className="flex flex-col gap-2">
        <h1 className="break-words text-2xl font-semibold tracking-tight text-[var(--sf-text)] sm:text-3xl">
          {vehicle.make} {vehicle.model}
        </h1>
        <p className="text-sm text-[var(--sf-text-muted)]">
          {formatPublicVehicleMileage(vehicle)} · {vehicle.year}
          {vehicle.fuel ? ` · ${VEHICLE_FUEL_LABELS_RO[vehicle.fuel]}` : ""}
          {vehicle.transmission
            ? ` · ${VEHICLE_TRANSMISSION_LABELS_RO[vehicle.transmission]}`
            : ""}
        </p>
        <p className="text-3xl font-bold tracking-tight text-[var(--sf-text)]">
          {formatPublicVehiclePrice(vehicle)}
        </p>
        {vehicle.priceNegotiable ? (
          <p className="text-sm font-medium" style={{ color }}>
            Preț negociabil
          </p>
        ) : null}
      </header>

      {highlights.length > 0 ? (
        <section aria-labelledby="vehicle-highlights-heading">
          <h2 id="vehicle-highlights-heading" className="sr-only">
            Specificații principale
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {highlights.map((item) => (
              <li
                key={item.label}
                className="rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-[var(--sf-surface)] px-3 py-3"
              >
                <p className="text-xs font-medium tracking-wide text-[var(--sf-text-muted)] uppercase">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--sf-text)]">{item.value}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-[var(--sf-surface)] p-4 sm:p-5"
        >
          <h2 className="mb-3 text-base font-semibold text-[var(--sf-text)]">{section.title}</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {section.rows.map((row) => (
              <div key={`${section.title}-${row.label}`}>
                <dt className="text-xs font-medium tracking-wide text-[var(--sf-text-muted)] uppercase">
                  {row.label}
                </dt>
                <dd className="mt-1 text-sm whitespace-pre-wrap text-[var(--sf-text)]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {vehicle.description ? (
        <section className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-[var(--sf-surface)] p-4 sm:p-5">
          <h2 className="mb-3 text-base font-semibold text-[var(--sf-text)]">Descriere</h2>
          <p className="text-sm leading-6 whitespace-pre-wrap text-[var(--sf-text-muted)]">
            {vehicle.description}
          </p>
        </section>
      ) : null}

      {vehicle.features.length > 0 ? (
        <section className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-[var(--sf-surface)] p-4 sm:p-5">
          <h2 className="mb-3 text-base font-semibold text-[var(--sf-text)]">Dotări</h2>
          <ul className="flex flex-wrap gap-2">
            {vehicle.features.map((feature) => (
              <li
                key={feature.key}
                className="rounded-full border border-[var(--sf-border)] bg-[var(--sf-bg)] px-3 py-1.5 text-sm text-[var(--sf-text)]"
              >
                {feature.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
