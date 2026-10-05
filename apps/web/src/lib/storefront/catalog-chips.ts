import { formatPriceEurRo, formatMileageKmRo } from "@auto-platform/types";
import type { VehicleBodyType, VehicleFuel, VehicleTransmission } from "@auto-platform/types";
import {
  VEHICLE_BODY_TYPE_LABELS_RO,
  VEHICLE_FUEL_LABELS_RO,
  VEHICLE_TRANSMISSION_LABELS_RO,
} from "@/lib/vehicles/vehicle-field-labels";
import {
  buildCatalogHref,
  type CatalogQuery,
  DEFAULT_CATALOG_QUERY,
} from "./catalog-query";

export type CatalogChip =
  | { id: "q"; kind: "q"; label: string }
  | { id: "price"; kind: "price"; label: string }
  | { id: "year"; kind: "year"; label: string }
  | { id: "km"; kind: "km"; label: string }
  | { id: `fuel:${VehicleFuel}`; kind: "fuel"; value: VehicleFuel; label: string }
  | {
      id: `transmission:${VehicleTransmission}`;
      kind: "transmission";
      value: VehicleTransmission;
      label: string;
    }
  | {
      id: `bodyType:${VehicleBodyType}`;
      kind: "bodyType";
      value: VehicleBodyType;
      label: string;
    };

/** Active filter chips (excludes sort + page). */
export function catalogQueryHasFilterChips(query: CatalogQuery): boolean {
  if (query.q) return true;
  if (query.priceMin !== null || query.priceMax !== null) return true;
  if (query.yearMin !== null || query.yearMax !== null) return true;
  if (query.kmMin !== null || query.kmMax !== null) return true;
  if (query.fuel.length > 0) return true;
  if (query.transmission.length > 0) return true;
  if (query.bodyType.length > 0) return true;
  return false;
}

function formatRangeChip(
  prefix: string,
  min: number | null,
  max: number | null,
  format: (n: number) => string,
): string {
  if (min !== null && max !== null) return `${prefix} ${format(min)} – ${format(max)}`;
  if (min !== null) return `${prefix} de la ${format(min)}`;
  if (max !== null) return `${prefix} până la ${format(max)}`;
  return prefix;
}

export function buildCatalogChips(query: CatalogQuery): CatalogChip[] {
  const chips: CatalogChip[] = [];
  if (query.q) {
    chips.push({ id: "q", kind: "q", label: `Căutare: ${query.q}` });
  }
  if (query.priceMin !== null || query.priceMax !== null) {
    chips.push({
      id: "price",
      kind: "price",
      label: formatRangeChip("Preț", query.priceMin, query.priceMax, formatPriceEurRo),
    });
  }
  if (query.yearMin !== null || query.yearMax !== null) {
    chips.push({
      id: "year",
      kind: "year",
      label: formatRangeChip("An", query.yearMin, query.yearMax, (n) => String(n)),
    });
  }
  if (query.kmMin !== null || query.kmMax !== null) {
    chips.push({
      id: "km",
      kind: "km",
      label: formatRangeChip("Km", query.kmMin, query.kmMax, formatMileageKmRo),
    });
  }
  for (const value of query.fuel) {
    chips.push({
      id: `fuel:${value}`,
      kind: "fuel",
      value,
      label: VEHICLE_FUEL_LABELS_RO[value],
    });
  }
  for (const value of query.transmission) {
    chips.push({
      id: `transmission:${value}`,
      kind: "transmission",
      value,
      label: VEHICLE_TRANSMISSION_LABELS_RO[value],
    });
  }
  for (const value of query.bodyType) {
    chips.push({
      id: `bodyType:${value}`,
      kind: "bodyType",
      value,
      label: VEHICLE_BODY_TYPE_LABELS_RO[value],
    });
  }
  return chips;
}

/** Removes one chip's filter; resets page to 1; keeps other filters + sort. */
export function queryWithoutChip(query: CatalogQuery, chip: CatalogChip): CatalogQuery {
  const next: CatalogQuery = { ...query, page: 1 };
  switch (chip.kind) {
    case "q":
      next.q = null;
      break;
    case "price":
      next.priceMin = null;
      next.priceMax = null;
      break;
    case "year":
      next.yearMin = null;
      next.yearMax = null;
      break;
    case "km":
      next.kmMin = null;
      next.kmMax = null;
      break;
    case "fuel":
      next.fuel = query.fuel.filter((v) => v !== chip.value);
      break;
    case "transmission":
      next.transmission = query.transmission.filter((v) => v !== chip.value);
      break;
    case "bodyType":
      next.bodyType = query.bodyType.filter((v) => v !== chip.value);
      break;
  }
  return next;
}

export function hrefWithoutChip(query: CatalogQuery, chip: CatalogChip): string {
  return buildCatalogHref(queryWithoutChip(query, chip));
}

export function resetCatalogHref(): string {
  return "/";
}

/** Short pagination window with ellipses for large totals. */
export function buildPaginationItems(
  current: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push("ellipsis");
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
}

export function catalogResultsLabel(total: number): string {
  if (total === 1) return "1 vehicul găsit";
  return `${total} vehicule găsite`;
}

/** Number of active filter chips (excludes sort + page). Used for mobile trigger badge. */
export function countActiveCatalogFilters(query: CatalogQuery): number {
  return buildCatalogChips(query).length;
}

export { DEFAULT_CATALOG_QUERY };
