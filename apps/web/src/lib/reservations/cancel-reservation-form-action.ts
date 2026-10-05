"use server";

import { redirect } from "next/navigation";
import { InsufficientRoleError } from "@auto-platform/core";
import { requireRole } from "@/lib/auth/require-role";
import { reservationDetailPath } from "@/lib/dashboard/nav";
import { cancelReservation } from "@/lib/reservations/cancel-reservation";
import {
  parseCancelReservationForm,
  rejectTenantIdFromReservationForm,
} from "@/lib/reservations/parse-reservation-form";
import { RESERVATION_MUTATION_ROLES } from "@/lib/reservations/reservation-permissions";
import { revalidateAfterReservationMutation, loadVehicleSlugForRevalidate } from "@/lib/reservations/revalidate-reservation-paths";

export type CancelReservationFormState = {
  error: string | null;
};

export async function cancelReservationFormAction(
  _prev: CancelReservationFormState | null,
  formData: FormData,
): Promise<CancelReservationFormState> {
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

  const parsed = parseCancelReservationForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const result = await cancelReservation(session, parsed.data);
  if (!result.ok) {
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
  redirect(reservationDetailPath(result.data.id, { cancelled: "1" }));
}
