import { pgEnum } from "drizzle-orm/pg-core";

export const tenantStatusEnum = pgEnum("tenant_status", ["active", "suspended", "trial"]);
export const tenantPlanEnum = pgEnum("tenant_plan", ["starter", "premium"]);
export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "manager",
  "sales",
  "viewer",
]);
export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "draft",
  "available",
  "reserved",
  "sold",
  "archived",
]);

/** Etapa 6 — vehicle attribute enums (DB values EN; UI labels RO). */
export const vehicleFuelEnum = pgEnum("vehicle_fuel", [
  "petrol",
  "diesel",
  "hybrid",
  "plugin_hybrid",
  "electric",
  "lpg",
  "cng",
  "other",
]);
export const vehicleTransmissionEnum = pgEnum("vehicle_transmission", [
  "manual",
  "automatic",
  "dct",
  "cvt",
  "other",
]);
export const vehicleBodyTypeEnum = pgEnum("vehicle_body_type", [
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
]);
export const vehicleDriveTypeEnum = pgEnum("vehicle_drive_type", [
  "fwd",
  "rwd",
  "awd",
  "4wd",
]);
export const vehicleConditionEnum = pgEnum("vehicle_condition", [
  "new",
  "used",
  "demo",
]);
export const vehicleEmissionEnum = pgEnum("vehicle_emission", [
  "euro_3",
  "euro_4",
  "euro_5",
  "euro_6",
  "euro_6d",
  "euro_6e",
  "ev",
  "other",
]);
export const vehicleVatRegimeEnum = pgEnum("vehicle_vat_regime", [
  "deductible",
  "included",
  "not_applicable",
]);
export const vehicleAccidentStatusEnum = pgEnum("vehicle_accident_status", [
  "none",
  "cosmetic",
  "minor",
  "major",
  "unknown",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
  "archived",
]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "active",
  "expired",
  "cancelled",
  "converted",
]);
export const vehicleMediaTypeEnum = pgEnum("vehicle_media_type", [
  "image",
  "video",
  "document",
]);
