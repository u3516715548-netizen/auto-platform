"use client";

import type { ReactNode } from "react";
import type { VehicleFeatureKey } from "@auto-platform/types";
import type { PublicVehicleDto } from "@/lib/storefront/public-dto";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
} from "@/lib/storefront/public-vehicle-display";
import {
  VEHICLE_BODY_TYPE_LABELS_RO,
  VEHICLE_CONDITION_LABELS_RO,
  VEHICLE_DRIVE_TYPE_LABELS_RO,
  VEHICLE_EMISSION_LABELS_RO,
  VEHICLE_FUEL_LABELS_RO,
  VEHICLE_TRANSMISSION_LABELS_RO,
  VEHICLE_VAT_REGIME_LABELS_RO,
} from "@/lib/vehicles/vehicle-field-labels";
import { toStorefrontVehicleLite } from "@/lib/storefront/storefront-vehicle-lite";
import type { PublicVehicleImageDto } from "@/lib/storefront/public-gallery-helpers";
import { PublicVehicleGallery } from "./public-vehicle-gallery";
import { VehicleFinancePanel } from "./vehicle-finance-panel";
import { VehicleListActions } from "./vehicle-list-actions";
import { VehicleShareButton } from "./vehicle-share-button";
import {
  IconBattery,
  IconBolt,
  IconBody,
  IconCalendar,
  IconCheckCircle,
  IconChip,
  IconComfort,
  IconDoors,
  IconDrive,
  IconEngine,
  IconFlame,
  IconGauge,
  IconLocation,
  IconMusic,
  IconPalette,
  IconSeats,
  IconShield,
  IconTransmission,
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

type TechTile = {
  key: string;
  label: string;
  value: string;
  color: string;
  icon: ReactNode;
};

type FeatureGroup = {
  id: string;
  title: string;
  color: string;
  icon: ReactNode;
  items: Array<{ key: string; label: string }>;
};

const FEATURE_GROUPS: Array<{
  id: string;
  title: string;
  color: string;
  keys: VehicleFeatureKey[];
  icon: "shield" | "comfort" | "chip" | "music";
}> = [
  {
    id: "safety",
    title: "Siguranță",
    color: "#22c55e",
    keys: ["abs", "esp", "airbag"],
    icon: "shield",
  },
  {
    id: "comfort",
    title: "Confort",
    color: "#14b8a6",
    keys: ["ac", "climate_auto", "leather", "heated_seats", "sunroof", "keyless"],
    icon: "comfort",
  },
  {
    id: "assist",
    title: "Electronică & asistență",
    color: "#3b82f6",
    keys: [
      "parking_sensors",
      "parking_camera",
      "cruise",
      "adaptive_cruise",
      "led_lights",
      "xenon",
      "tow_hitch",
    ],
    icon: "chip",
  },
  {
    id: "audio",
    title: "Audio & conectivitate",
    color: "#eab308",
    keys: ["nav", "android_auto", "carplay"],
    icon: "music",
  },
];

const PREVIEW_COUNT = 6;

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

function GroupIcon({ kind }: { kind: "shield" | "comfort" | "chip" | "music" }) {
  if (kind === "shield") return <IconShield size={16} />;
  if (kind === "comfort") return <IconComfort size={16} />;
  if (kind === "chip") return <IconChip size={16} />;
  return <IconMusic size={16} />;
}

function buildTechTiles(vehicle: PublicVehicleDto): TechTile[] {
  const tiles: TechTile[] = [];
  if (vehicle.fuel) {
    tiles.push({
      key: "fuel",
      label: "Combustibil",
      value: VEHICLE_FUEL_LABELS_RO[vehicle.fuel],
      color: "#ef4444",
      icon: <IconFlame size={18} />,
    });
  }
  if (vehicle.transmission) {
    tiles.push({
      key: "transmission",
      label: "Transmisie",
      value: VEHICLE_TRANSMISSION_LABELS_RO[vehicle.transmission],
      color: "#3b82f6",
      icon: <IconTransmission size={18} />,
    });
  }
  if (vehicle.bodyType) {
    tiles.push({
      key: "body",
      label: "Caroserie",
      value: VEHICLE_BODY_TYPE_LABELS_RO[vehicle.bodyType],
      color: "#8b5cf6",
      icon: <IconBody size={18} />,
    });
  }
  if (vehicle.driveType) {
    tiles.push({
      key: "drive",
      label: "Tracțiune",
      value: VEHICLE_DRIVE_TYPE_LABELS_RO[vehicle.driveType],
      color: "#0d9488",
      icon: <IconDrive size={18} />,
    });
  }
  if (vehicle.powerHp != null) {
    tiles.push({
      key: "power",
      label: "Putere",
      value: `${vehicle.powerHp} CP`,
      color: "#f59e0b",
      icon: <IconBolt size={18} />,
    });
  }
  if (vehicle.engineDisplacementCc != null) {
    tiles.push({
      key: "cc",
      label: "Cilindree",
      value: `${vehicle.engineDisplacementCc} cm³`,
      color: "#22d3ee",
      icon: <IconEngine size={18} />,
    });
  }
  if (vehicle.condition) {
    tiles.push({
      key: "condition",
      label: "Stare",
      value: VEHICLE_CONDITION_LABELS_RO[vehicle.condition],
      color: "#64748b",
      icon: <IconGauge size={18} />,
    });
  }
  if (vehicle.emissionStandard) {
    tiles.push({
      key: "emission",
      label: "Normă",
      value: VEHICLE_EMISSION_LABELS_RO[vehicle.emissionStandard],
      color: "#22c55e",
      icon: <IconLeafish />,
    });
  }
  if (vehicle.doors != null) {
    tiles.push({
      key: "doors",
      label: "Uși",
      value: String(vehicle.doors),
      color: "#6366f1",
      icon: <IconDoors size={18} />,
    });
  }
  if (vehicle.seats != null) {
    tiles.push({
      key: "seats",
      label: "Locuri",
      value: String(vehicle.seats),
      color: "#ec4899",
      icon: <IconSeats size={18} />,
    });
  }
  if (vehicle.exteriorColor) {
    tiles.push({
      key: "ext",
      label: "Exterior",
      value: vehicle.exteriorColor,
      color: "#a855f7",
      icon: <IconPalette size={18} />,
    });
  }
  if (vehicle.interiorColor) {
    tiles.push({
      key: "int",
      label: "Interior",
      value: vehicle.interiorColor,
      color: "#14b8a6",
      icon: <IconPalette size={18} />,
    });
  }
  if (vehicle.vatRegime) {
    tiles.push({
      key: "vat",
      label: "TVA",
      value: VEHICLE_VAT_REGIME_LABELS_RO[vehicle.vatRegime],
      color: "#b45309",
      icon: <IconBattery size={18} />,
    });
  }
  tiles.push({
    key: "year",
    label: "An",
    value: String(vehicle.year),
    color: "#2563eb",
    icon: <IconCalendar size={18} />,
  });
  tiles.push({
    key: "km",
    label: "Kilometraj",
    value: formatPublicVehicleMileage(vehicle),
    color: "#eab308",
    icon: <IconGauge size={18} />,
  });
  return tiles;
}

function IconLeafish() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M5 19c2-4 6-8 10-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function buildFeatureGroups(
  features: PublicVehicleDto["features"],
): FeatureGroup[] {
  const byKey = new Map(features.map((f) => [f.key, f.label]));
  return FEATURE_GROUPS.map((group) => {
    const items = group.keys
      .filter((k) => byKey.has(k))
      .map((k) => ({ key: k, label: byKey.get(k)! }));
    return {
      id: group.id,
      title: group.title,
      color: group.color,
      icon: <GroupIcon kind={group.icon} />,
      items,
    };
  }).filter((g) => g.items.length > 0);
}

function SectionHeading({
  num,
  title,
  subtitle,
  color,
  headingId,
}: {
  num: string;
  title: string;
  subtitle: string;
  color: string;
  headingId?: string;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <p className="sf-section-num shrink-0 tabular-nums" style={{ color }} aria-hidden>
        {num}
      </p>
      <div className="min-w-0 flex-1 pt-0.5">
        <h2 id={headingId} className="text-xl font-bold tracking-tight text-[var(--sf-text)]">
          <span className="sr-only">{num}. </span>
          {title}
        </h2>
        <p className="mt-1 text-sm text-[var(--sf-text-muted)]">{subtitle}</p>
      </div>
    </div>
  );
}

function FeatureCategory({ group }: { group: FeatureGroup }) {
  const preview = group.items.slice(0, PREVIEW_COUNT);
  const rest = group.items.slice(PREVIEW_COUNT);
  return (
    <div className="border-t border-[var(--sf-border)] pt-4 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: group.color }}
          aria-hidden
        >
          {group.icon}
        </span>
        <h3 className="min-w-0 flex-1 text-base font-bold text-[var(--sf-text)]">{group.title}</h3>
        <span className="text-sm text-[var(--sf-text-muted)]">{group.items.length}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {preview.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-sm text-[var(--sf-text)]">
            <span className="mt-0.5 shrink-0 text-[var(--sf-text-muted)]" aria-hidden>
              <IconCheckCircle size={16} />
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      {rest.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer list-none text-sm font-medium text-[var(--sf-text-muted)] marker:content-none [&::-webkit-details-marker]:hidden">
            Vezi toate ({rest.length} în plus) ⌵
          </summary>
          <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2.5">
            {rest.map((item) => (
              <li key={item.key} className="flex items-start gap-2 text-sm text-[var(--sf-text)]">
                <span className="mt-0.5 shrink-0 text-[var(--sf-text-muted)]" aria-hidden>
                  <IconCheckCircle size={16} />
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/**
 * Template 1 vehicle detail — gallery, highlights, finance 01, Tehnic+Dotări 02, Descriere 03.
 */
export function PublicVehicleDetail({
  vehicle,
  images = [],
  accent,
  leadsEnabled = false,
}: PublicVehicleDetailProps) {
  const color = accent ?? "var(--sf-accent)";
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;
  const highlights = buildHighlights(vehicle);
  const techTiles = buildTechTiles(vehicle);
  const featureGroups = buildFeatureGroups(vehicle.features);
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
  const featureCount = vehicle.features.length;

  return (
    <div className="flex min-w-0 flex-col gap-8 sm:gap-10">
      <PublicVehicleGallery
        key={images.map((img) => `${img.sortOrder}:${img.url ?? "x"}`).join("|")}
        images={images}
        vehicleLabel={vehicleLabel}
        accent={accent}
      />

      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
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
              <p className="mt-1 text-sm font-medium" style={{ color }}>
                Preț negociabil
              </p>
            ) : null}
            <h1 className="break-words pt-1 text-2xl font-bold tracking-tight text-[var(--sf-text)] sm:text-3xl">
              {vehicle.make} {vehicle.model}
            </h1>
          </div>
          <VehicleShareButton title={vehicleLabel} />
        </div>
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

      <section
        id="vehicle-section-finance"
        className="scroll-mt-24"
        aria-labelledby="finance-heading"
      >
        <VehicleFinancePanel vehiclePrice={vehicle.price} leadsEnabled={leadsEnabled} />
      </section>

      <section
        id="vehicle-section-tech"
        className="scroll-mt-24 flex flex-col gap-4"
        aria-labelledby="tech-heading"
      >
        <SectionHeading
          num="02"
          title="Tehnic + Dotări"
          subtitle="Specificațiile și echiparea vehiculului."
          color="#2563eb"
          headingId="tech-heading"
        />

        {techTiles.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {techTiles.map((tile) => (
              <li key={tile.key}>
                <div className="flex min-h-[6.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface-muted)] px-3 py-4 text-center">
                  <span
                    className="inline-flex size-10 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: tile.color }}
                    aria-hidden
                  >
                    {tile.icon}
                  </span>
                  <span className="text-sm font-bold text-[var(--sf-text)]">{tile.value}</span>
                  <span className="text-[11px] text-[var(--sf-text-muted)]">{tile.label}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {featureCount > 0 ? (
          <div className="sf-solid-card rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] p-4 sm:p-5">
            <h3 className="text-xl font-bold text-[var(--sf-text)]">Dotări</h3>
            <p className="mt-1 mb-4 text-sm text-[var(--sf-text-muted)]">
              {featureCount} {featureCount === 1 ? "dotare confirmată" : "dotări confirmate"} pentru
              acest exemplar.
            </p>
            <div className="flex flex-col gap-5">
              {featureGroups.map((group) => (
                <FeatureCategory key={group.id} group={group} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section
        id="vehicle-section-description"
        className="scroll-mt-24 flex flex-col gap-3"
        aria-labelledby="description-heading"
      >
        <SectionHeading
          num="03"
          title="Descriere"
          subtitle="Informații suplimentare despre acest vehicul."
          color="#7c3aed"
          headingId="description-heading"
        />
        <div className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-border)] bg-white p-4 sm:p-5">
          {vehicle.description ? (
            <p className="text-sm leading-6 whitespace-pre-wrap text-[var(--sf-text-muted)]">
              {vehicle.description}
            </p>
          ) : (
            <p className="text-sm leading-6 text-[var(--sf-text-muted)]">
              Descrierea pentru acest vehicul va fi adăugată în curând.
            </p>
          )}
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
    </div>
  );
}
