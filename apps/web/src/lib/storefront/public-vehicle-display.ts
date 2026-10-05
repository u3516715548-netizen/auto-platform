import { formatMileageKmRo, formatPriceEurRo } from "@auto-platform/types";
import {
  VEHICLE_ACCIDENT_STATUS_LABELS_RO,
  VEHICLE_BODY_TYPE_LABELS_RO,
  VEHICLE_CONDITION_LABELS_RO,
  VEHICLE_DRIVE_TYPE_LABELS_RO,
  VEHICLE_EMISSION_LABELS_RO,
  VEHICLE_FUEL_LABELS_RO,
  VEHICLE_TRANSMISSION_LABELS_RO,
  VEHICLE_VAT_REGIME_LABELS_RO,
} from "@/lib/vehicles/vehicle-field-labels";
import type { PublicVehicleDto } from "./public-dto";

const MONTHS_RO = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
] as const;

export function formatPublicVehiclePrice(vehicle: Pick<PublicVehicleDto, "price">): string {
  return formatPriceEurRo(vehicle.price);
}

export function formatPublicVehicleMileage(vehicle: Pick<PublicVehicleDto, "mileage">): string {
  return formatMileageKmRo(vehicle.mileage);
}

/** Short technical line for catalog cards (fuel · transmission · body · power). */
export function formatPublicVehicleCatalogSummary(vehicle: PublicVehicleDto): string | null {
  const parts: string[] = [];
  if (vehicle.fuel) parts.push(VEHICLE_FUEL_LABELS_RO[vehicle.fuel]);
  if (vehicle.transmission) parts.push(VEHICLE_TRANSMISSION_LABELS_RO[vehicle.transmission]);
  if (vehicle.bodyType) parts.push(VEHICLE_BODY_TYPE_LABELS_RO[vehicle.bodyType]);
  if (vehicle.powerHp != null && vehicle.powerHp > 0) parts.push(`${vehicle.powerHp} CP`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export type PublicDetailRow = { label: string; value: string };

export function buildPublicVehicleDetailSections(
  vehicle: PublicVehicleDto,
): Array<{ title: string; rows: PublicDetailRow[] }> {
  const sections: Array<{ title: string; rows: PublicDetailRow[] }> = [];

  const priceValue = vehicle.priceNegotiable
    ? `${formatPublicVehiclePrice(vehicle)} (negociabil)`
    : formatPublicVehiclePrice(vehicle);
  const base: PublicDetailRow[] = [
    { label: "Marcă", value: vehicle.make },
    { label: "Model", value: vehicle.model },
    { label: "An model", value: String(vehicle.year) },
    { label: "Kilometraj", value: formatPublicVehicleMileage(vehicle) },
    { label: "Preț", value: priceValue },
  ];
  if (vehicle.locationCity) {
    base.push({ label: "Locație", value: vehicle.locationCity });
  }
  sections.push({ title: "Date de bază", rows: base });

  const tech: PublicDetailRow[] = [];
  if (vehicle.fuel) tech.push({ label: "Combustibil", value: VEHICLE_FUEL_LABELS_RO[vehicle.fuel] });
  if (vehicle.transmission) {
    tech.push({ label: "Transmisie", value: VEHICLE_TRANSMISSION_LABELS_RO[vehicle.transmission] });
  }
  if (vehicle.bodyType) {
    tech.push({ label: "Caroserie", value: VEHICLE_BODY_TYPE_LABELS_RO[vehicle.bodyType] });
  }
  if (vehicle.driveType) {
    tech.push({ label: "Tracțiune", value: VEHICLE_DRIVE_TYPE_LABELS_RO[vehicle.driveType] });
  }
  if (vehicle.condition) {
    tech.push({ label: "Stare", value: VEHICLE_CONDITION_LABELS_RO[vehicle.condition] });
  }
  if (vehicle.powerHp != null) tech.push({ label: "Putere", value: `${vehicle.powerHp} CP` });
  if (vehicle.engineDisplacementCc != null) {
    tech.push({ label: "Cilindree", value: `${vehicle.engineDisplacementCc} cm³` });
  }
  if (vehicle.emissionStandard) {
    tech.push({
      label: "Normă poluare",
      value: VEHICLE_EMISSION_LABELS_RO[vehicle.emissionStandard],
    });
  }
  if (vehicle.doors != null) tech.push({ label: "Uși", value: String(vehicle.doors) });
  if (vehicle.seats != null) tech.push({ label: "Locuri", value: String(vehicle.seats) });
  if (vehicle.exteriorColor) tech.push({ label: "Culoare exterior", value: vehicle.exteriorColor });
  if (vehicle.interiorColor) tech.push({ label: "Culoare interior", value: vehicle.interiorColor });
  if (tech.length > 0) sections.push({ title: "Tehnic", rows: tech });

  const fiscal: PublicDetailRow[] = [];
  if (vehicle.vatRegime) {
    fiscal.push({ label: "Regim TVA", value: VEHICLE_VAT_REGIME_LABELS_RO[vehicle.vatRegime] });
  }
  if (fiscal.length > 0) sections.push({ title: "Preț și fiscal", rows: fiscal });

  const history: PublicDetailRow[] = [];
  if (vehicle.firstRegistrationYear != null) {
    const month =
      vehicle.firstRegistrationMonth != null &&
      vehicle.firstRegistrationMonth >= 1 &&
      vehicle.firstRegistrationMonth <= 12
        ? MONTHS_RO[vehicle.firstRegistrationMonth - 1]
        : null;
    history.push({
      label: "Prima înmatriculare",
      value: month
        ? `${month} ${vehicle.firstRegistrationYear}`
        : String(vehicle.firstRegistrationYear),
    });
  }
  if (vehicle.originCountry) {
    history.push({ label: "Țara de origine", value: vehicle.originCountry });
  }
  if (vehicle.accidentStatus) {
    history.push({
      label: "Istoric accidente",
      value: VEHICLE_ACCIDENT_STATUS_LABELS_RO[vehicle.accidentStatus],
    });
  }
  history.push({
    label: "Carte service",
    value: vehicle.hasServiceBook ? "Da" : "Nu",
  });
  history.push({
    label: "Istoric service",
    value: vehicle.hasServiceHistory ? "Da" : "Nu",
  });
  if (vehicle.warrantyMonths != null && vehicle.warrantyMonths > 0) {
    history.push({ label: "Garanție", value: `${vehicle.warrantyMonths} luni` });
  }
  if (vehicle.warrantyNotes) {
    history.push({ label: "Note garanție", value: vehicle.warrantyNotes });
  }
  if (history.length > 0) sections.push({ title: "Stare și istoric", rows: history });

  return sections;
}
