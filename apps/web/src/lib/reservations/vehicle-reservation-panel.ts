import type { MembershipRole } from "@auto-platform/core";
import type { VehicleStatus } from "@auto-platform/types";
import { canShowCreateReservationCta } from "@/lib/reservations/reservation-permissions";

export type VehicleReservationPanel =
  | { kind: "create" }
  | { kind: "reserved"; hasManageLink: boolean }
  | { kind: "sold" }
  | { kind: "none" };

/**
 * Pure UI contract for reservation panel on vehicle dashboard (11C).
 * Manage link only when an active reservation id was resolved tenant-scoped.
 */
export function resolveVehicleReservationPanel(input: {
  role: MembershipRole;
  vehicleStatus: VehicleStatus;
  activeReservationId: string | null;
}): VehicleReservationPanel {
  if (canShowCreateReservationCta(input.role, input.vehicleStatus)) {
    return { kind: "create" };
  }
  if (input.vehicleStatus === "reserved") {
    return {
      kind: "reserved",
      hasManageLink: Boolean(input.activeReservationId),
    };
  }
  if (input.vehicleStatus === "sold") {
    return { kind: "sold" };
  }
  return { kind: "none" };
}
