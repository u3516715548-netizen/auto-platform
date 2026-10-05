/**
 * Domain vehicles — permissions, slug helpers, create input shaping.
 * DB access lives in apps/web (server) with withTenantContext + RLS.
 */

import { hasAnyRole, type MembershipRole } from "../tenancy/index";

export type VehicleId = string;

/** Roles allowed to create/update vehicles (RLS + app). Viewer is read-only. */
export const VEHICLE_MUTATION_ROLES = ["owner", "manager", "sales"] as const;
export type VehicleMutationRole = (typeof VEHICLE_MUTATION_ROLES)[number];

export function canCreateVehicle(role: MembershipRole): boolean {
  return hasAnyRole(role, VEHICLE_MUTATION_ROLES);
}

export function canMutateVehicle(role: MembershipRole): boolean {
  return canCreateVehicle(role);
}

export function isArchivedVehicleStatus(status: string): boolean {
  return status === "archived";
}

/** Active inventory statuses (soft-archive stays out of default stock list). */
export const VEHICLE_ACTIVE_STATUSES = [
  "draft",
  "available",
  "reserved",
  "sold",
] as const;

/** Build a URL-safe slug from make/model/year (no tenant id). */
export function buildVehicleSlug(make: string, model: string, year: number): string {
  const base = slugifyToken(`${make}-${model}-${year}`);
  return base.length > 0 ? base.slice(0, 80) : `vehicle-${year}`;
}

export function slugifyToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function withSlugSuffix(base: string, attempt: number): string {
  if (attempt <= 0) return base.slice(0, 80);
  const suffix = `-${attempt + 1}`;
  return `${base.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`;
}
