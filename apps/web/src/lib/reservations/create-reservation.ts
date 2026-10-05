import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { assertTenantAccess, computeReservationExpiresAt } from "@auto-platform/core";
import {
  getDb,
  reservations,
  vehicles,
  withTenantContext,
  writeAuditLog,
} from "@auto-platform/db";
import {
  createReservationInputSchema,
  type CreateReservationInput,
  type ReservationStatus,
} from "@auto-platform/types";
import type { MembershipSession } from "@/lib/auth/require-membership";
import { requireRole } from "@/lib/auth/require-role";
import { InsufficientRoleError } from "@auto-platform/core";
import { expireStaleReservations } from "@/lib/reservations/expire-reservations";
import {
  RESERVATION_MESSAGES,
  isUniqueViolation,
  reservationFail,
  reservationOk,
  uniqueViolationConstraint,
  type ReservationResult,
} from "@/lib/reservations/reservation-errors";
import { RESERVATION_MUTATION_ROLES } from "@/lib/reservations/reservation-permissions";

export type ReservationSnapshot = {
  id: string;
  vehicleId: string;
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
  idempotencyKey: string;
  replayed: boolean;
};

/**
 * Creates an active reservation and sets vehicle available → reserved atomically.
 * Idempotent on (tenantId, idempotencyKey).
 */
export async function createReservation(
  session: MembershipSession,
  rawInput: CreateReservationInput,
): Promise<ReservationResult<ReservationSnapshot>> {
  const parsed = createReservationInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return reservationFail("INVALID_INPUT", RESERVATION_MESSAGES.invalidInput);
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const vehicleId = parsed.data.vehicleId;
  const idempotencyKey = parsed.data.idempotencyKey ?? randomUUID();
  const now = new Date();
  const expiresAt = computeReservationExpiresAt(now);

  try {
    return await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      await expireStaleReservations(db, {
        tenantId,
        actorProfileId: profileId,
        vehicleId,
        now,
      });

      const existingByKey = await db
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
        .where(
          and(
            eq(reservations.tenantId, tenantId),
            eq(reservations.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);

      const replay = existingByKey[0];
      if (replay) {
        assertTenantAccess(tenantId, replay.tenantId);
        if (replay.vehicleId !== vehicleId) {
          return reservationFail("CONFLICT", RESERVATION_MESSAGES.conflict);
        }
        return reservationOk({
          id: replay.id,
          vehicleId: replay.vehicleId,
          status: replay.status,
          expiresAt: replay.expiresAt,
          createdAt: replay.createdAt,
          idempotencyKey: replay.idempotencyKey,
          replayed: true,
        });
      }

      // Conditional claim: only available vehicles in this tenant.
      const claimed = await db
        .update(vehicles)
        .set({
          status: "reserved",
          updatedAt: now,
        })
        .where(
          and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.tenantId, tenantId),
            eq(vehicles.status, "available"),
          ),
        )
        .returning({
          id: vehicles.id,
          tenantId: vehicles.tenantId,
          status: vehicles.status,
        });

      const vehicle = claimed[0];
      if (!vehicle) {
        // Concurrent idempotent retry may have lost the available→reserved race.
        const [raced] = await db
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
          .where(
            and(
              eq(reservations.tenantId, tenantId),
              eq(reservations.idempotencyKey, idempotencyKey),
            ),
          )
          .limit(1);
        if (raced && raced.vehicleId === vehicleId) {
          assertTenantAccess(tenantId, raced.tenantId);
          return reservationOk({
            id: raced.id,
            vehicleId: raced.vehicleId,
            status: raced.status,
            expiresAt: raced.expiresAt,
            createdAt: raced.createdAt,
            idempotencyKey: raced.idempotencyKey,
            replayed: true,
          });
        }

        const [found] = await db
          .select({ id: vehicles.id, tenantId: vehicles.tenantId, status: vehicles.status })
          .from(vehicles)
          .where(and(eq(vehicles.id, vehicleId), eq(vehicles.tenantId, tenantId)))
          .limit(1);
        if (!found) {
          return reservationFail("NOT_FOUND", RESERVATION_MESSAGES.vehicleNotFound);
        }
        return reservationFail(
          "VEHICLE_NOT_AVAILABLE",
          RESERVATION_MESSAGES.vehicleNotAvailable,
        );
      }
      assertTenantAccess(tenantId, vehicle.tenantId);

      let inserted;
      try {
        const rows = await db
          .insert(reservations)
          .values({
            tenantId,
            vehicleId,
            status: "active",
            expiresAt,
            createdBy: profileId,
            idempotencyKey,
            createdAt: now,
            updatedAt: now,
          })
          .returning({
            id: reservations.id,
            vehicleId: reservations.vehicleId,
            status: reservations.status,
            expiresAt: reservations.expiresAt,
            createdAt: reservations.createdAt,
            idempotencyKey: reservations.idempotencyKey,
            tenantId: reservations.tenantId,
          });
        inserted = rows[0];
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;

        const constraint = uniqueViolationConstraint(error) ?? "";
        // Same idempotency key raced — return existing row (no second audit).
        if (
          constraint.includes("idempotency") ||
          /idempotency/i.test(String((error as { message?: string }).message ?? ""))
        ) {
          const [again] = await db
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
            .where(
              and(
                eq(reservations.tenantId, tenantId),
                eq(reservations.idempotencyKey, idempotencyKey),
              ),
            )
            .limit(1);
          if (again && again.vehicleId === vehicleId) {
            // Roll back vehicle claim if we aren't the owner of the reservation —
            // transaction will abort on throw; instead we must throw to rollback
            // if another winner reserved with different key, or return replay.
            // We're inside a TX where we already set vehicle reserved; if the
            // winning insert was ours via race on idempotency, vehicle state is correct.
            // If unique was on active-per-vehicle, throw domain conflict → full rollback.
            return reservationOk({
              id: again.id,
              vehicleId: again.vehicleId,
              status: again.status,
              expiresAt: again.expiresAt,
              createdAt: again.createdAt,
              idempotencyKey: again.idempotencyKey,
              replayed: true,
            });
          }
        }

        // Active-per-vehicle or other unique → abort TX (vehicle claim rolls back).
        throw new Error("RESERVATION_CONFLICT");
      }

      if (!inserted) {
        throw new Error("RESERVATION_INSERT_EMPTY");
      }
      assertTenantAccess(tenantId, inserted.tenantId);

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "reservation.created",
        entityType: "reservation",
        entityId: inserted.id,
        metadata: {
          vehicleId: inserted.vehicleId,
          fromStatus: null,
          toStatus: inserted.status,
          expiresAt: inserted.expiresAt.toISOString(),
        },
      });

      return reservationOk({
        id: inserted.id,
        vehicleId: inserted.vehicleId,
        status: inserted.status,
        expiresAt: inserted.expiresAt,
        createdAt: inserted.createdAt,
        idempotencyKey: inserted.idempotencyKey,
        replayed: false,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RESERVATION_CONFLICT") {
      return reservationFail("CONFLICT", RESERVATION_MESSAGES.conflict);
    }
    return reservationFail("INTERNAL", RESERVATION_MESSAGES.internal);
  }
}

/**
 * Server Action wrapper — staff only. No redirect (UI in 11B).
 */
export async function createReservationAction(
  raw: CreateReservationInput,
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
  return createReservation(session, raw);
}
