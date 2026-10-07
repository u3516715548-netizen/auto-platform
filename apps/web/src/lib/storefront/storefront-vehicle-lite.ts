import { formatMileageKmRo, formatPriceEurRo } from "@auto-platform/types";
import type { PublicVehicleDto } from "@/lib/storefront/public-dto";
import {
  VEHICLE_FUEL_LABELS_RO,
  VEHICLE_TRANSMISSION_LABELS_RO,
  VEHICLE_VAT_REGIME_LABELS_RO,
} from "@/lib/vehicles/vehicle-field-labels";

/** Lightweight snapshot persisted in localStorage for Compară / Salvate (no DB). */
export type StorefrontVehicleLite = {
  slug: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: string;
  currency: "EUR";
  fuel: PublicVehicleDto["fuel"];
  transmission: PublicVehicleDto["transmission"];
  powerHp: number | null;
  vatRegime: PublicVehicleDto["vatRegime"];
  locationCity: string | null;
  priceNegotiable: boolean;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  /** Public catalog listings are in-stock when visible. */
  stockStatus: "in_stock";
};

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;

export function toStorefrontVehicleLite(
  vehicle: Pick<
    PublicVehicleDto,
    | "slug"
    | "make"
    | "model"
    | "year"
    | "mileage"
    | "price"
    | "currency"
    | "fuel"
    | "transmission"
    | "powerHp"
    | "vatRegime"
    | "locationCity"
    | "priceNegotiable"
  > & {
    coverImage?: { url: string | null; altText: string | null } | null;
  },
): StorefrontVehicleLite {
  return {
    slug: vehicle.slug,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    mileage: vehicle.mileage,
    price: vehicle.price,
    currency: "EUR",
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    powerHp: vehicle.powerHp,
    vatRegime: vehicle.vatRegime,
    locationCity: vehicle.locationCity,
    priceNegotiable: vehicle.priceNegotiable,
    coverImageUrl: vehicle.coverImage?.url ?? null,
    coverImageAlt: vehicle.coverImage?.altText ?? null,
    stockStatus: "in_stock",
  };
}

export function formatLitePrice(vehicle: StorefrontVehicleLite): string {
  return formatPriceEurRo(vehicle.price);
}

export function formatLiteMileage(vehicle: StorefrontVehicleLite): string {
  return formatMileageKmRo(vehicle.mileage);
}

export function formatLiteFuel(vehicle: StorefrontVehicleLite): string {
  return vehicle.fuel ? VEHICLE_FUEL_LABELS_RO[vehicle.fuel] : "—";
}

export function formatLiteTransmission(vehicle: StorefrontVehicleLite): string {
  return vehicle.transmission ? VEHICLE_TRANSMISSION_LABELS_RO[vehicle.transmission] : "—";
}

export function formatLiteVat(vehicle: StorefrontVehicleLite): string {
  return vehicle.vatRegime ? VEHICLE_VAT_REGIME_LABELS_RO[vehicle.vatRegime] : "—";
}

export function formatLitePower(vehicle: StorefrontVehicleLite): string {
  return vehicle.powerHp != null && vehicle.powerHp > 0 ? `${vehicle.powerHp} CP` : "—";
}

export function parsePriceEurNumber(price: string): number {
  const n = Number(price);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Catalog card estimate horizon (months). Not a bank offer. */
export const ESTIMATE_MONTHLY_RATE_MONTHS = 60;

/**
 * Simple catalog estimate: vehicle price ÷ 60 months, rounded to whole EUR.
 * Returns null when there is no public price.
 */
export function estimateMonthlyRateEur(price: string | number | null | undefined): number | null {
  if (price == null || price === "") return null;
  const n = typeof price === "number" ? price : parsePriceEurNumber(price);
  if (!(n > 0)) return null;
  return Math.round(n / ESTIMATE_MONTHLY_RATE_MONTHS);
}

/** Display: `482 EUR/lună` (Romanian grouping). */
export function formatEstimateMonthlyRateEur(monthlyEur: number): string {
  if (!Number.isFinite(monthlyEur) || monthlyEur <= 0) return "";
  const amount = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(monthlyEur);
  return `${amount} EUR/lună`;
}

export const ESTIMATE_MONTHLY_RATE_NOTE =
  "Estimare pentru 60 luni. Condițiile finale depind de finanțator.";

/**
 * Fixed-rate monthly payment (annuity).
 * principalEur = vehicle price − down payment; annualRatePercent e.g. 4.9; months ≥ 1.
 */
export function calculateFixedMonthlyPayment(
  principalEur: number,
  annualRatePercent: number,
  months: number,
): number {
  if (!(principalEur > 0) || !(months > 0)) return 0;
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return principalEur / months;
  const factor = Math.pow(1 + r, months);
  return (principalEur * r * factor) / (factor - 1);
}

export function formatMonthlyPaymentEur(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return formatPriceEurRo(amount.toFixed(2));
}
