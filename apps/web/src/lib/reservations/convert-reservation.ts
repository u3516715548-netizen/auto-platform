import { and, eq } from "drizzle-orm";
import { InsufficientRoleError, assertTenantAccess } from "@auto-platform/core";
import {
  getDb,
  reservations,
  vehicles,
  withTenantContext,
  writeAuditLog,
} from "@auto-platform/db";
import {
  convertReservationInputSchema,
  type ConvertReservationInput,
  type ReservationStatus,
} from "@auto-platform/types";
import type { MembershipSession } from "@/lib/auth/require-membership";
import { requireRole } from "@/lib/auth/require-role";
import { expireStaleReservations } from "@/lib/reservations/expire-reservations";
import {
  RESERVATION_MESSAGES,
  reservationFail,
  reservationOk,
  type ReservationResult,
} from "@/lib/reservations/reservation-errors";
import { RESERVATION_MUTATION_ROLES } from "@/lib/reservations/reservation-permissions";
import type { ReservationSnapshot } from "@/lib/reservations/create-reservation";

/**
 * Converts an active reservation and sets vehicle reserved → sold when still reserved.
 */
export async function convertReservation(
  session: MembershipSession,
  rawInput: ConvertReservationInput,
): Promise<ReservationResult<ReservationSnapshot>> {
  const parsed = convertReservationInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return reservationFail("INVALID_INPUT", RESERVATION_MESSAGES.invalidInput);
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const reservationId = parsed.data.reservationId;
  const now = new Date();

  try {
    return await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      await expireStaleReservations(db, {
        tenantId,
        actorProfileId: profileId,
        reservationId,
        now,
      });

      const [current] = await db
        .select({
          id: reservations.id,
          tenantId: reservations.tenantId,
          vehicleId: reservations.vehicleId,
          status: reservations.status,
          expiresAt: reservations.expiresAt,
          createdAt: reservations.createdAt,
          idempotencyKey: reservations.idempotencyKey,
        })
        .from(reservations)
        .where(and(eq(reservations.id, reservationId), eq(reservations.tenantId, tenantId)))
        .limit(1);

      if (!current) {
        return reservationFail("NOT_FOUND", RESERVATION_MESSAGES.notFound);
      }
      assertTenantAccess(tenantId, current.tenantId);

      if (current.status !== "active") {
        return reservationFail("NOT_ACTIVE", RESERVATION_MESSAGES.notActive);
      }

      const updatedRows = await db
        .update(reservations)
        .set({
          status: "converted",
          updatedAt: now,
        })
        .where(
          and(
            eq(reservations.id, reservationId),
            eq(reservations.tenantId, tenantId),
            eq(reservations.status, "active"),
          ),
        )
        .returning({
          id: reservations.id,
          vehicleId: reservations.vehicleId,
          status: reservations.status,
          expiresAt: reservations.expiresAt,
          createdAt: reservations.createdAt,
          idempotencyKey: reservations.idempotencyKey,
          tenantId: reservations.tenantId,
        });

      const updated = updatedRows[0];
      if (!updated) {
        return reservationFail("NOT_ACTIVE", RESERVATION_MESSAGES.notActive);
      }
      assertTenantAccess(tenantId, updated.tenantId);

      const sold = await db
        .update(vehicles)
        .set({
          status: "sold",
          updatedAt: now,
        })
        .where(
          and(
            eq(vehicles.id, updated.vehicleId),
            eq(vehicles.tenantId, tenantId),
            eq(vehicles.status, "reserved"),
          ),
        )
        .returning({ id: vehicles.id });

      if (!sold[0]) {
        // Reservation converted but vehicle was not reserved — treat as conflict domain.
        throw new Error("VEHICLE_NOT_RESERVED");
      }

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "reservation.converted",
        entityType: "reservation",
        entityId: updated.id,
        metadata: {
          vehicleId: updated.vehicleId,
          fromStatus: "active" satisfies ReservationStatus,
          toStatus: "converted" satisfies ReservationStatus,
          expiresAt: updated.expiresAt.toISOString(),
        },
      });

      return reservationOk({
        id: updated.id,
        vehicleId: updated.vehicleId,
        status: updated.status,
        expiresAt: updated.expiresAt,
        createdAt: updated.createdAt,
        idempotencyKey: updated.idempotencyKey,
        replayed: false,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "VEHICLE_NOT_RESERVED") {
      return reservationFail("CONFLICT", RESERVATION_MESSAGES.conflict);
    }
    return reservationFail("INTERNAL", RESERVATION_MESSAGES.internal);
  }
}

export async function convertReservationAction(
  raw: ConvertReservationInput,
): Promise<ReservationResult<ReservationSnapshot>> {
  let session: MembershipSession;
  try {
    session = await requireRole(RESERVATION_MUTATION_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return reservationFail("FORBIDDEN", RESERVATION_MESSAGES.forbidden);
    }
    throw error;
  }
  return convertReservation(session, raw);
}
