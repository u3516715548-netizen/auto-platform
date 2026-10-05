import type { PublicVehicleDto } from "@/lib/storefront/public-dto";
import type { PublicVehicleImageDto } from "@/lib/storefront/public-gallery-helpers";
import {
  buildPublicVehicleDetailSections,
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
} from "@/lib/storefront/public-vehicle-display";
import {
  VEHICLE_FUEL_LABELS_RO,
  VEHICLE_TRANSMISSION_LABELS_RO,
  VEHICLE_VAT_REGIME_LABELS_RO,
} from "@/lib/vehicles/vehicle-field-labels";
import { toStorefrontVehicleLite } from "@/lib/storefront/storefront-vehicle-lite";
import { PublicVehicleGallery } from "./public-vehicle-gallery";
import { VehicleFinancePanel } from "./vehicle-finance-panel";
import { VehicleListActions } from "./vehicle-list-actions";
import {
  IconBolt,
  IconCalendar,
  IconEngine,
  IconGauge,
  IconLocation,
} from "./icons";

type PublicVehicleDetailProps = {
  vehicle: PublicVehicleDto;
  images?: PublicVehicleImageDto[];
  accent?: string | null;
  leadsEnabled?: boolean;
};

type Highlight = {
  label: string;
  value: string;
  unit: string | null;
  tone: string;
  icon: "bolt" | "calendar" | "gauge" | "engine";
};

const SECTION_META: Record<string, { color: string; subtitle: string }> = {
  "Date de bază": {
    color: "#b45309",
    subtitle: "Identificare și preț pentru acest vehicul.",
  },
  Tehnic: {
    color: "#2563eb",
    subtitle: "Specificații tehnice verificate ale mașinii.",
  },
  "Preț și fiscal": {
    color: "#7c3aed",
    subtitle: "Informații fiscale disponibile public.",
  },
  "Stare și istoric": {
    color: "#0d9488",
    subtitle: "Istoric și stare declarate la publicare.",
  },
};

function formatMileageParts(mileage: number): { value: string; unit: string } {
  const formatted = formatPublicVehicleMileage({ mileage });
  const match = formatted.match(/^(.+?)\s*(km)$/i);
  if (match) return { value: match[1]!, unit: match[2]! };
  return { value: formatted, unit: "km" };
}

function buildHighlights(vehicle: PublicVehicleDto): Highlight[] {
  const items: Highlight[] = [];
  if (vehicle.powerHp != null && vehicle.powerHp > 0) {
    items.push({
      label: "Putere",
      value: String(vehicle.powerHp),
      unit: "CP",
      tone: "#ef4444",
      icon: "bolt",
    });
  }
  items.push({
    label: "An fabricație",
    value: String(vehicle.year),
    unit: null,
    tone: "#3b82f6",
    icon: "calendar",
  });
  {
    const km = formatMileageParts(vehicle.mileage);
    items.push({
      label: "Kilometraj",
      value: km.value,
      unit: km.unit,
      tone: "#eab308",
      icon: "gauge",
    });
  }
  if (vehicle.engineDisplacementCc != null && vehicle.engineDisplacementCc > 0) {
    items.push({
      label: "Capacitate",
      value: String(vehicle.engineDisplacementCc),
      unit: "cm³",
      tone: "#22d3ee",
      icon: "engine",
    });
  } else if (vehicle.fuel) {
    items.push({
      label: "Combustibil",
      value: VEHICLE_FUEL_LABELS_RO[vehicle.fuel],
      unit: null,
      tone: "#22d3ee",
      icon: "engine",
    });
  }
  return items.slice(0, 4);
}

function HighlightIcon({ kind }: { kind: Highlight["icon"] }) {
  if (kind === "bolt") return <IconBolt size={16} />;
  if (kind === "calendar") return <IconCalendar size={16} />;
  if (kind === "gauge") return <IconGauge size={16} />;
  return <IconEngine size={16} />;
}

/**
 * Template 1 vehicle detail — gallery dominant, numbered sections; E7 gallery contract unchanged.
 */
export function PublicVehicleDetail({
  vehicle,
  images = [],
  accent,
  leadsEnabled = false,
}: PublicVehicleDetailProps) {
  const sections = buildPublicVehicleDetailSections(vehicle);
  const color = accent ?? "var(--sf-accent)";
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;
  const highlights = buildHighlights(vehicle);
  const vatLabel = vehicle.vatRegime
    ? VEHICLE_VAT_REGIME_LABELS_RO[vehicle.vatRegime]
    : null;
  const cover = images.find((img) => img.url) ?? images[0] ?? null;
  const lite = toStorefrontVehicleLite({
    ...vehicle,
    coverImage: cover
      ? { url: cover.url, altText: cover.altText }
      : null,
  });

  return (
    <div className="flex min-w-0 flex-col gap-8 sm:gap-10">
      <PublicVehicleGallery
        key={images.map((img) => `${img.sortOrder}:${img.url ?? "x"}`).join("|")}
        images={images}
        vehicleLabel={vehicleLabel}
        accent={accent}
      />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <p className="text-3xl font-bold tracking-tight text-[var(--sf-text)] sm:text-4xl">
            {formatPublicVehiclePrice(vehicle)}
          </p>
          {vatLabel ? (
            <p className="pb-1 text-xs font-semibold tracking-wide text-[var(--sf-success)] uppercase">
              {vatLabel}
            </p>
          ) : null}
        </div>
        {vehicle.priceNegotiable ? (
          <p className="text-sm font-medium" style={{ color }}>
            Preț negociabil
          </p>
        ) : null}

        <h1 className="break-words pt-1 text-2xl font-bold tracking-tight text-[var(--sf-text)] sm:text-3xl">
          {vehicle.make} {vehicle.model}
        </h1>
        {vehicle.locationCity ? (
          <p className="flex items-center gap-1.5 text-sm text-[var(--sf-text-muted)]">
            <IconLocation size={14} />
            {vehicle.locationCity}
          </p>
        ) : null}
        <p className="text-sm text-[var(--sf-text-muted)]">
          {formatPublicVehicleMileage(vehicle)} · {vehicle.year}
          {vehicle.fuel ? ` · ${VEHICLE_FUEL_LABELS_RO[vehicle.fuel]}` : ""}
          {vehicle.transmission
            ? ` · ${VEHICLE_TRANSMISSION_LABELS_RO[vehicle.transmission]}`
            : ""}
        </p>
        <div className="pt-2">
          <VehicleListActions vehicle={lite} variant="detail" />
        </div>
      </header>

      {highlights.length > 0 ? (
        <section aria-labelledby="vehicle-highlights-heading">
          <h2 id="vehicle-highlights-heading" className="sr-only">
            Specificații principale
          </h2>
          <ul
            className="grid overflow-hidden rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface-muted)]"
            style={{
              gridTemplateColumns: `repeat(${Math.min(highlights.length, 4)}, minmax(0, 1fr))`,
            }}
          >
            {highlights.map((item, index) => (
              <li
                key={item.label}
                className={`flex flex-col items-center px-2 py-4 text-center sm:px-3 sm:py-5 ${
                  index > 0 ? "border-l border-[var(--sf-border)]" : ""
                }`}
              >
                <span className="mb-2.5 inline-flex" style={{ color: item.tone }} aria-hidden>
                  <HighlightIcon kind={item.icon} />
                </span>
                <p className="flex flex-wrap items-baseline justify-center gap-x-1 leading-none">
                  <span className="text-lg font-bold tracking-tight text-[var(--sf-text)] sm:text-xl">
                    {item.value}
                  </span>
                  {item.unit ? (
                    <span className="text-sm font-semibold text-[var(--sf-text)]">{item.unit}</span>
                  ) : null}
                </p>
                <p className="mt-1.5 text-[11px] leading-tight text-[var(--sf-text-muted)] sm:text-xs">
                  {item.label}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <VehicleFinancePanel vehiclePrice={vehicle.price} leadsEnabled={leadsEnabled} />

      {sections.map((section, index) => {
        const meta = SECTION_META[section.title] ?? {
          color,
          subtitle: "",
        };
        const num = String(index + 2).padStart(2, "0");
        return (
          <section key={section.title} className="flex flex-col gap-3">
            <div>
              <p className="sf-section-num" style={{ color: meta.color }}>
                {num}
              </p>
              <div
                className="mt-1 mb-2 h-0.5 w-8 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <h2 className="text-xl font-bold text-[var(--sf-text)]">{section.title}</h2>
              {meta.subtitle ? (
                <p className="mt-1 text-sm text-[var(--sf-text-muted)]">{meta.subtitle}</p>
              ) : null}
            </div>
            <div className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-white p-4 sm:p-5">
              <dl className="grid gap-2 sm:grid-cols-2">
                {section.rows.map((row) => (
                  <div key={`${section.title}-${row.label}`} className="sf-spec-tile">
                    <dt className="text-[10px] font-semibold tracking-wide text-[var(--sf-text-muted)] uppercase">
                      {row.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold whitespace-pre-wrap text-[var(--sf-text)]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        );
      })}

      {vehicle.description ? (
        <section className="flex flex-col gap-3">
          <div>
            <p className="sf-section-num" style={{ color: "#7c3aed" }}>
              {String(sections.length + 2).padStart(2, "0")}
            </p>
            <div className="mt-1 mb-2 h-0.5 w-8 rounded-full bg-[#7c3aed]" />
            <h2 className="text-xl font-bold text-[var(--sf-text)]">Descriere</h2>
            <p className="mt-1 text-sm text-[var(--sf-text-muted)]">
              Detalii complete despre acest vehicul.
            </p>
          </div>
          <div className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-white p-4 sm:p-5">
            <h3 className="mb-2 text-base font-bold text-[var(--sf-text)]">Descriere</h3>
            <p className="text-sm leading-6 whitespace-pre-wrap text-[var(--sf-text-muted)]">
              {vehicle.description}
            </p>
            {vehicle.locationCity ? (
              <p className="mt-4 flex items-center gap-1.5 border-t border-[var(--sf-border)] pt-3 text-sm text-[var(--sf-text)]">
                <span style={{ color: "var(--sf-accent)" }} aria-hidden>
                  <IconLocation size={14} />
                </span>
                {vehicle.locationCity}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {vehicle.features.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-white p-4 sm:p-5">
            <h2 className="text-xl font-bold text-[var(--sf-text)]">Dotări</h2>
            <p className="mt-1 mb-4 text-sm text-[var(--sf-text-muted)]">
              {vehicle.features.length}{" "}
              {vehicle.features.length === 1 ? "dotare confirmată" : "dotări confirmate"} pentru
              acest exemplar
            </p>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
              {vehicle.features.map((feature) => (
                <li
                  key={feature.key}
                  className="flex items-start gap-2 text-sm text-[var(--sf-text)]"
                >
                  <span
                    className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: "var(--sf-success)" }}
                    aria-hidden
                  >
                    ✓
                  </span>
                  {feature.label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
