import { pgEnum } from "drizzle-orm/pg-core";

export const tenantStatusEnum = pgEnum("tenant_status", ["active", "suspended", "trial"]);
export const tenantPlanEnum = pgEnum("tenant_plan", ["starter", "premium"]);
export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "manager",
  "sales",
  "viewer",
]);

/** Etapa 21 — tenant invitation lifecycle. */
export const tenantInvitationStatusEnum = pgEnum("tenant_invitation_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

/** Etapa 22 — Romanian company entity kinds (structural only). */
export const companyEntityTypeEnum = pgEnum("company_entity_type", [
  "srl",
  "sa",
  "pfa",
  "ii",
  "other",
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

/** Etapa 17 — email notification delivery outcome (separate from CRM `lead_status`). */
export const leadNotificationStatusEnum = pgEnum("lead_notification_status", [
  "pending",
  "skipped",
  "not_configured",
  "no_recipients",
  "sent",
  "failed",
]);

/** Etapa 19 — finance applicant kind. */
export const financeApplicantTypeEnum = pgEnum("finance_applicant_type", [
  "individual",
  "company",
]);

/** Etapa 19 — finance application CRM status (separate from lead_status). */
export const financeApplicationStatusEnum = pgEnum("finance_application_status", [
  "new",
  "contacted",
  "in_review",
  "approved",
  "rejected",
  "withdrawn",
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
