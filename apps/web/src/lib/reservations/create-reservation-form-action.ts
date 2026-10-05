"use server";

import { redirect } from "next/navigation";
import { InsufficientRoleError } from "@auto-platform/core";
import { requireRole } from "@/lib/auth/require-role";
import { reservationDetailPath } from "@/lib/dashboard/nav";
import { createReservation } from "@/lib/reservations/create-reservation";
import {
  parseCreateReservationForm,
  rejectTenantIdFromReservationForm,
} from "@/lib/reservations/parse-reservation-form";
import { RESERVATION_MUTATION_ROLES } from "@/lib/reservations/reservation-permissions";
import { revalidateAfterReservationMutation, loadVehicleSlugForRevalidate } from "@/lib/reservations/revalidate-reservation-paths";

export type CreateReservationFormState = {
  error: string | null;
};

/**
 * Dashboard form action — create reservation via 11A service, then revalidate + redirect.
 */
export async function createReservationFormAction(
  _prev: CreateReservationFormState | null,
  formData: FormData,
): Promise<CreateReservationFormState> {
  const tenantError = rejectTenantIdFromReservationForm(formData);
  if (tenantError) return { error: tenantError };

  let session;
  try {
    session = await requireRole(RESERVATION_MUTATION_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { error: "Rolul tău nu permite gestionarea rezervărilor." };
    }
    throw error;
  }

  const parsed = parseCreateReservationForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const result = await createReservation(session, parsed.data);
  if (!result.ok) {
    if (result.code === "VEHICLE_NOT_AVAILABLE" || result.code === "CONFLICT") {
      return { error: "Vehiculul nu mai este disponibil pentru rezervare." };
    }
    if (result.code === "FORBIDDEN") {
      return { error: result.error };
    }
    if (result.code === "NOT_FOUND") {
      return { error: "Vehiculul nu există pe acest dealer." };
    }
    return { error: result.error };
  }

  const vehicleSlug = await loadVehicleSlugForRevalidate({
    profileId: session.user.profile.id,
    tenantId: session.tenant.tenantId,
    vehicleId: result.data.vehicleId,
  });
  revalidateAfterReservationMutation({
    reservationId: result.data.id,
    vehicleId: result.data.vehicleId,
    vehicleSlug,
  });
  redirect(reservationDetailPath(result.data.id, { created: "1" }));
}
