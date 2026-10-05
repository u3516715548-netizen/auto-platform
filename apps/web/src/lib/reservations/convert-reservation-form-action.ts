"use server";

import { redirect } from "next/navigation";
import { InsufficientRoleError } from "@auto-platform/core";
import { requireRole } from "@/lib/auth/require-role";
import { reservationDetailPath } from "@/lib/dashboard/nav";
import { convertReservation } from "@/lib/reservations/convert-reservation";
import {
  parseConvertReservationForm,
  rejectTenantIdFromReservationForm,
} from "@/lib/reservations/parse-reservation-form";
import { RESERVATION_MUTATION_ROLES } from "@/lib/reservations/reservation-permissions";
import { revalidateAfterReservationMutation, loadVehicleSlugForRevalidate } from "@/lib/reservations/revalidate-reservation-paths";

export type ConvertReservationFormState = {
  error: string | null;
};

export async function convertReservationFormAction(
  _prev: ConvertReservationFormState | null,
  formData: FormData,
): Promise<ConvertReservationFormState> {
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

  const parsed = parseConvertReservationForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const result = await convertReservation(session, parsed.data);
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
  redirect(reservationDetailPath(result.data.id, { converted: "1" }));
}
