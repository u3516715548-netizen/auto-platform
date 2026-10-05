import {
  formatMileageKmRo,
  formatPriceEurRo,
  TEMPLATE_1_FALLBACK_PRIMARY_COLOR,
  normalizePublicContactNumber,
  primaryColorHexSchema,
  publicPhoneSchema,
  publicWhatsappSchema,
  type StorefrontTemplateId,
  VEHICLE_FEATURE_KEYS,
  VEHICLE_FEATURE_LABELS_RO,
  type VehicleAccidentStatus,
  type VehicleBodyType,
  type VehicleCondition,
  type VehicleDriveType,
  type VehicleEmission,
  type VehicleFeatureKey,
  type VehicleFuel,
  type VehicleTransmission,
  type VehicleVatRegime,
  vehicleFeatureKeySchema,
} from "@auto-platform/types";
import { resolveStorefrontTemplateId } from "@/lib/storefront/templates/registry";

export type PublicBrandingFields = {
  primaryColor: string;
  templateId: StorefrontTemplateId;
  phone?: string;
  whatsapp?: string;
};

/**
 * Extracts a safe public primaryColor from tenants.branding jsonb.
 * Returns null when missing or invalid — never returns raw branding.
 * Prefer `parsePublicBranding` for storefront DTO (applies Template 1 fallback).
 */
export function parsePublicPrimaryColor(branding: unknown): string | null {
  if (!branding || typeof branding !== "object" || Array.isArray(branding)) {
    return null;
  }
  const raw = (branding as Record<string, unknown>).primaryColor;
  if (typeof raw !== "string") return null;
  const parsed = primaryColorHexSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Whitelist parse of tenants.branding for public storefront.
 * Never returns raw branding; unknown keys are ignored on read.
 * Write path uses tenantBrandingUpdateSchema.strict() (rejects unknown keys).
 */
export function parsePublicBranding(branding: unknown): PublicBrandingFields {
  const source =
    branding && typeof branding === "object" && !Array.isArray(branding)
      ? (branding as Record<string, unknown>)
      : {};

  const colorParsed = primaryColorHexSchema.safeParse(source.primaryColor);
  const primaryColor = colorParsed.success
    ? colorParsed.data
    : TEMPLATE_1_FALLBACK_PRIMARY_COLOR;

  const out: PublicBrandingFields = {
    primaryColor,
    templateId: resolveStorefrontTemplateId(source.templateId),
  };

  if (typeof source.phone === "string") {
    const phone = publicPhoneSchema.safeParse(source.phone);
    if (phone.success) out.phone = phone.data;
  }
  if (typeof source.whatsapp === "string") {
    const whatsapp = publicWhatsappSchema.safeParse(source.whatsapp);
    if (whatsapp.success) out.whatsapp = whatsapp.data;
  }

  return out;
}

/** Normalize a contact string for tests/helpers; null when invalid. */
export function parsePublicContactNumber(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return normalizePublicContactNumber(raw);
}

/** Specs whitelist: legacy helper (not exposed on PublicVehicleDto in Etapa 6C). */
export function filterPublicSpecs(specs: unknown): Record<string, string | number | boolean> {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
    return {};
  }
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(specs as Record<string, unknown>)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(key)) continue;
    if (typeof value === "string" && value.length <= 120) {
      out[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

export type PublicVehicleFeatureDto = {
  key: VehicleFeatureKey;
  label: string;
};

/** Approved public vehicle fields (Etapa 6C). Never includes id, tenantId, vin, status, audit, specs. */
export type PublicVehicleDto = {
  slug: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: string;
  currency: "EUR";
  fuel: VehicleFuel | null;
  transmission: VehicleTransmission | null;
  bodyType: VehicleBodyType | null;
  condition: VehicleCondition | null;
  powerHp: number | null;
  description: string | null;
  driveType: VehicleDriveType | null;
  engineDisplacementCc: number | null;
  emissionStandard: VehicleEmission | null;
  doors: number | null;
  seats: number | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  firstRegistrationYear: number | null;
  firstRegistrationMonth: number | null;
  priceNegotiable: boolean;
  vatRegime: VehicleVatRegime | null;
  originCountry: string | null;
  locationCity: string | null;
  warrantyMonths: number | null;
  warrantyNotes: string | null;
  hasServiceBook: boolean;
  hasServiceHistory: boolean;
  accidentStatus: VehicleAccidentStatus | null;
  features: PublicVehicleFeatureDto[];
};

export const PUBLIC_VEHICLE_DTO_KEYS = [
  "slug",
  "make",
  "model",
  "year",
  "mileage",
  "price",
  "currency",
  "fuel",
  "transmission",
  "bodyType",
  "condition",
  "powerHp",
  "description",
  "driveType",
  "engineDisplacementCc",
  "emissionStandard",
  "doors",
  "seats",
  "exteriorColor",
  "interiorColor",
  "firstRegistrationYear",
  "firstRegistrationMonth",
  "priceNegotiable",
  "vatRegime",
  "originCountry",
  "locationCity",
  "warrantyMonths",
  "warrantyNotes",
  "hasServiceBook",
  "hasServiceHistory",
  "accidentStatus",
  "features",
] as const;

const PUBLIC_VEHICLE_FORBIDDEN_KEYS = [
  "id",
  "tenantId",
  "tenant_id",
  "vin",
  "status",
  "createdAt",
  "updatedAt",
  "specs",
  "audit",
] as const;

/** Ensures a plain object does not carry forbidden public keys (tests + defense). */
export function assertNoForbiddenPublicVehicleKeys(obj: Record<string, unknown>): void {
  for (const key of PUBLIC_VEHICLE_FORBIDDEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      throw new Error(`Forbidden public vehicle key: ${key}`);
    }
  }
}

export function filterPublicFeatures(features: unknown): PublicVehicleFeatureDto[] {
  if (!Array.isArray(features)) return [];
  const seen = new Set<VehicleFeatureKey>();
  const out: PublicVehicleFeatureDto[] = [];
  for (const item of features) {
    if (typeof item !== "string") continue;
    const parsed = vehicleFeatureKeySchema.safeParse(item);
    if (!parsed.success || seen.has(parsed.data)) continue;
    seen.add(parsed.data);
    out.push({ key: parsed.data, label: VEHICLE_FEATURE_LABELS_RO[parsed.data] });
    if (out.length >= VEHICLE_FEATURE_KEYS.length) break;
  }
  return out;
}

function sanitizePublicPlainText(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let plain = trimmed
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "");
  plain = plain.trim();
  if (!plain) return null;
  return plain.length > maxLen ? plain.slice(0, maxLen) : plain;
}

function sanitizePublicDescription(value: unknown): string | null {
  return sanitizePublicPlainText(value, 5000);
}

function sanitizePublicColor(value: unknown): string | null {
  const plain = sanitizePublicPlainText(value, 60);
  if (!plain || /javascript:|on\w+=/i.test(plain)) return null;
  return plain;
}

function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  if (typeof value !== "string") return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

const FUELS = [
  "petrol",
  "diesel",
  "hybrid",
  "plugin_hybrid",
  "electric",
  "lpg",
  "cng",
  "other",
] as const satisfies readonly VehicleFuel[];
const TRANSMISSIONS = ["manual", "automatic", "dct", "cvt", "other"] as const;
const BODY_TYPES = [
  "hatchback",
  "sedan",
  "estate",
  "suv",
  "coupe",
  "convertible",
  "mpv",
  "van",
  "pickup",
  "other",
] as const;
const DRIVE_TYPES = ["fwd", "rwd", "awd", "4wd"] as const;
const CONDITIONS = ["new", "used", "demo"] as const;
const EMISSIONS = [
  "euro_3",
  "euro_4",
  "euro_5",
  "euro_6",
  "euro_6d",
  "euro_6e",
  "ev",
  "other",
] as const;
const VAT_REGIMES = ["deductible", "included", "not_applicable"] as const;
const ACCIDENT = ["none", "cosmetic", "minor", "major", "unknown"] as const;

function optionalInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export type PublicVehicleRowInput = {
  slug: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: string;
  currency: string;
  fuel: unknown;
  transmission: unknown;
  bodyType: unknown;
  condition: unknown;
  powerHp: unknown;
  description: unknown;
  driveType: unknown;
  engineDisplacementCc: unknown;
  emissionStandard: unknown;
  doors: unknown;
  seats: unknown;
  exteriorColor: unknown;
  interiorColor: unknown;
  firstRegistrationYear: unknown;
  firstRegistrationMonth: unknown;
  priceNegotiable: unknown;
  vatRegime: unknown;
  originCountry: unknown;
  locationCity: unknown;
  warrantyMonths: unknown;
  warrantyNotes: unknown;
  hasServiceBook: unknown;
  hasServiceHistory: unknown;
  accidentStatus: unknown;
  features: unknown;
};

export function toPublicVehicleDto(row: PublicVehicleRowInput): PublicVehicleDto {
  const dto: PublicVehicleDto = {
    slug: row.slug,
    make: row.make,
    model: row.model,
    year: row.year,
    mileage: row.mileage,
    price: row.price,
    currency: "EUR",
    fuel: optionalEnum(row.fuel, FUELS),
    transmission: optionalEnum(row.transmission, TRANSMISSIONS),
    bodyType: optionalEnum(row.bodyType, BODY_TYPES),
    condition: optionalEnum(row.condition, CONDITIONS),
    powerHp: optionalInt(row.powerHp),
    description: sanitizePublicDescription(row.description),
    driveType: optionalEnum(row.driveType, DRIVE_TYPES),
    engineDisplacementCc: optionalInt(row.engineDisplacementCc),
    emissionStandard: optionalEnum(row.emissionStandard, EMISSIONS),
    doors: optionalInt(row.doors),
    seats: optionalInt(row.seats),
    exteriorColor: sanitizePublicColor(row.exteriorColor),
    interiorColor: sanitizePublicColor(row.interiorColor),
    firstRegistrationYear: optionalInt(row.firstRegistrationYear),
    firstRegistrationMonth: optionalInt(row.firstRegistrationMonth),
    priceNegotiable: row.priceNegotiable === true,
    vatRegime: optionalEnum(row.vatRegime, VAT_REGIMES),
    originCountry:
      typeof row.originCountry === "string" && /^[A-Za-z]{2}$/.test(row.originCountry.trim())
        ? row.originCountry.trim().toUpperCase()
        : null,
    locationCity: sanitizePublicPlainText(row.locationCity, 80),
    warrantyMonths: optionalInt(row.warrantyMonths),
    warrantyNotes: sanitizePublicPlainText(row.warrantyNotes, 500),
    hasServiceBook: row.hasServiceBook === true,
    hasServiceHistory: row.hasServiceHistory === true,
    accidentStatus: optionalEnum(row.accidentStatus, ACCIDENT),
    features: filterPublicFeatures(row.features),
  };

  assertNoForbiddenPublicVehicleKeys(dto as unknown as Record<string, unknown>);
  return dto;
}

export function buildPublicVehicleDetailTitle(
  vehicle: Pick<PublicVehicleDto, "make" | "model" | "year" | "price">,
  dealerName: string,
): string {
  return `${vehicle.make} ${vehicle.model} ${vehicle.year} – ${formatPriceEurRo(vehicle.price)} | ${dealerName}`;
}

export function buildPublicVehicleDetailDescription(
  vehicle: Pick<PublicVehicleDto, "make" | "model" | "year" | "mileage" | "description">,
): string {
  const lead = `${vehicle.make} ${vehicle.model}, ${vehicle.year}, ${formatMileageKmRo(vehicle.mileage)}.`;
  const body = vehicle.description ? `${lead} ${vehicle.description}` : lead;
  const max = 160;
  if (body.length <= max) return body;
  return `${body.slice(0, max - 1).trimEnd()}…`;
}
