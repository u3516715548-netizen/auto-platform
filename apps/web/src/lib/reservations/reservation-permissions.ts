import {
  RESERVATION_MUTATION_ROLES,
  RESERVATION_TTL_MS,
  canMutateReservation,
  computeReservationExpiresAt,
} from "@auto-platform/core";
import type { MembershipRole } from "@auto-platform/core";
import type { VehicleStatus } from "@auto-platform/types";

export {
  RESERVATION_MUTATION_ROLES,
  RESERVATION_TTL_MS,
  canMutateReservation,
  computeReservationExpiresAt,
};

/** CTA „Creează rezervare” — only available inventory + mutation roles. */
export function canShowCreateReservationCta(
  role: MembershipRole,
  vehicleStatus: VehicleStatus,
): boolean {
  return canMutateReservation(role) && vehicleStatus === "available";
}
