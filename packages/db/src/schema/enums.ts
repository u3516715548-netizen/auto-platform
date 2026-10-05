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
