import { and, asc, eq, lte } from "drizzle-orm";
import {
  reservations,
  vehicles,
  writeAuditLog,
  type Database,
} from "@auto-platform/db";

export type ExpireReservationsOptions = {
  tenantId: string;
  /** Actor for audit; null when system/lazy without profile. */
  actorProfileId?: string | null;
  vehicleId?: string;
  reservationId?: string;
  now?: Date;
  /** Cap batch size for list sweeps. */
  limit?: number;
};

export type ExpireReservationsResult = {
  expiredCount: number;
  reservationIds: string[];
};

/**
 * Lazy expiry: marks `active` reservations with expiresAt <= now as `expired`,
 * and releases vehicles still `reserved` for those rows.
 * Safe to call repeatedly. Does not touch sold / cancelled / converted.
 *
 * Must run inside an existing `withTenantContext` transaction.
 */
export async function expireStaleReservations(
  db: Database,
  options: ExpireReservationsOptions,
): Promise<ExpireReservationsResult> {
  const now = options.now ?? new Date();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const actorProfileId = options.actorProfileId ?? null;

  const conditions = [
    eq(reservations.tenantId, options.tenantId),
    eq(reservations.status, "active"),
    lte(reservations.expiresAt, now),
  ];
  if (options.vehicleId) {
    conditions.push(eq(reservations.vehicleId, options.vehicleId));
  }
  if (options.reservationId) {
    conditions.push(eq(reservations.id, options.reservationId));
  }

  const stale = await db
    .select({
      id: reservations.id,
      vehicleId: reservations.vehicleId,
      tenantId: reservations.tenantId,
      expiresAt: reservations.expiresAt,
    })
    .from(reservations)
    .where(and(...conditions))
    .orderBy(asc(reservations.expiresAt))
    .limit(limit);

  const reservationIds: string[] = [];

  for (const row of stale) {
    const updated = await db
      .update(reservations)
      .set({
        status: "expired",
        updatedAt: now,
      })
      .where(
        and(
          eq(reservations.id, row.id),
          eq(reservations.tenantId, options.tenantId),
          eq(reservations.status, "active"),
          lte(reservations.expiresAt, now),
        ),
      )
      .returning({
        id: reservations.id,
        vehicleId: reservations.vehicleId,
        status: reservations.status,
      });

    const expired = updated[0];
    if (!expired) continue;

    await db
      .update(vehicles)
      .set({
        status: "available",
        updatedAt: now,
      })
      .where(
        and(
          eq(vehicles.id, expired.vehicleId),
          eq(vehicles.tenantId, options.tenantId),
          eq(vehicles.status, "reserved"),
        ),
      );

    await writeAuditLog(db, {
      tenantId: options.tenantId,
      actorProfileId,
      action: "reservation.expired",
      entityType: "reservation",
      entityId: expired.id,
      metadata: {
        vehicleId: expired.vehicleId,
        fromStatus: "active",
        toStatus: "expired",
        expiresAt: row.expiresAt.toISOString(),
      },
    });

    reservationIds.push(expired.id);
  }

  return { expiredCount: reservationIds.length, reservationIds };
}
