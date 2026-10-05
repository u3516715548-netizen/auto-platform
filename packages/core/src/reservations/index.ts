/**
 * Domain reservations — permissions aligned with RLS reservations_*_staff.
 */

import { hasAnyRole, type MembershipRole } from "../tenancy/index";

export type ReservationId = string;

/** Roles allowed to create/cancel/convert reservations (matches RLS). */
export const RESERVATION_MUTATION_ROLES = ["owner", "manager", "sales"] as const;
export type ReservationMutationRole = (typeof RESERVATION_MUTATION_ROLES)[number];

export function canMutateReservation(role: MembershipRole): boolean {
  return hasAnyRole(role, RESERVATION_MUTATION_ROLES);
}

/** Default hold duration (Etapa 11A). */
export const RESERVATION_TTL_MS = 48 * 60 * 60 * 1000;

export function computeReservationExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + RESERVATION_TTL_MS);
}
