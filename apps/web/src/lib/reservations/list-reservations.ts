import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  getDb,
  memberships,
  profiles,
  reservations,
  vehicles,
  withTenantContext,
} from "@auto-platform/db";
import type { MembershipRole } from "@auto-platform/core";
import {
  reservationIdSchema,
  vehicleIdSchema,
  type ReservationListFilter,
  type ReservationStatus,
} from "@auto-platform/types";
import { requireMembership } from "@/lib/auth/require-membership";
import { membershipRoleLabel } from "@/lib/dashboard/role-label";
import { expireStaleReservations } from "@/lib/reservations/expire-reservations";
import { reservationStatusesForFilter } from "@/lib/reservations/reservation-list-filter";

const LIST_EXPIRE_LIMIT = 50;

/** Max stale reservations expired on list entry (bounded lazy sweep). */
export const RESERVATION_LIST_EXPIRE_LIMIT = LIST_EXPIRE_LIMIT;

export type ReservationListItem = {
  id: string;
  status: ReservationStatus;
  createdAt: Date;
  expiresAt: Date;
  vehicle: { id: string; make: string; model: string } | null;
  /** Present only when profile name or tenant membership is visible under RLS. */
  creator: { displayName: string } | null;
};

function creatorDisplayName(
  profileName: string | null | undefined,
  role: MembershipRole | null | undefined,
): string | null {
  const trimmed = profileName?.trim();
  if (trimmed) return trimmed;
  if (role) return `Membru · ${membershipRoleLabel(role)}`;
  return null;
}

/**
 * Lists reservations for the Host tenant only.
 * Runs a limited lazy expiry sweep before the select.
 * Sort: active nearest expiry first, then newest created.
 */
export async function listTenantReservations(
  filter: ReservationListFilter = "all",
): Promise<ReservationListItem[]> {
  const { user, tenant } = await requireMembership();
  const tenantId = tenant.tenantId;
  const profileId = user.profile.id;
  const statusFilter = reservationStatusesForFilter(filter);

  const creatorProfiles = alias(profiles, "reservation_creator_profiles");
  const creatorMemberships = alias(memberships, "reservation_creator_memberships");

  return withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    await expireStaleReservations(db, {
      tenantId,
      actorProfileId: profileId,
      limit: LIST_EXPIRE_LIMIT,
    });

    const conditions = [eq(reservations.tenantId, tenantId)];
    if (statusFilter) {
      conditions.push(inArray(reservations.status, [...statusFilter]));
    }

    const rows = await db
      .select({
        id: reservations.id,
        tenantId: reservations.tenantId,
        status: reservations.status,
        createdAt: reservations.createdAt,
        expiresAt: reservations.expiresAt,
        createdBy: reservations.createdBy,
        vehicleId: vehicles.id,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
        vehicleTenantId: vehicles.tenantId,
        creatorName: creatorProfiles.name,
        creatorRole: creatorMemberships.role,
      })
      .from(reservations)
      .leftJoin(
        vehicles,
        and(eq(vehicles.id, reservations.vehicleId), eq(vehicles.tenantId, tenantId)),
      )
      .leftJoin(creatorProfiles, eq(creatorProfiles.id, reservations.createdBy))
      .leftJoin(
        creatorMemberships,
        and(
          eq(creatorMemberships.profileId, reservations.createdBy),
          eq(creatorMemberships.tenantId, tenantId),
        ),
      )
      .where(and(...conditions))
      .orderBy(
        sql`case when ${reservations.status} = 'active' then 0 else 1 end`,
        sql`case when ${reservations.status} = 'active' then ${reservations.expiresAt} end asc nulls last`,
        desc(reservations.createdAt),
      );

    return rows
      .filter((row) => row.tenantId === tenantId)
      .map((row) => {
        const displayName = creatorDisplayName(
          row.creatorName,
          row.creatorRole as MembershipRole | null,
        );
        return {
          id: row.id,
          status: row.status,
          createdAt: row.createdAt,
          expiresAt: row.expiresAt,
          vehicle:
            row.vehicleId && row.vehicleTenantId === tenantId
              ? { id: row.vehicleId, make: row.vehicleMake!, model: row.vehicleModel! }
              : null,
          creator: displayName ? { displayName } : null,
        };
      });
  });
}

export type TenantReservationDetail = {
  id: string;
  status: ReservationStatus;
  createdAt: Date;
  expiresAt: Date;
  vehicle: { id: string; make: string; model: string; status: string } | null;
  creator: { displayName: string } | null;
};

export type TenantReservationAccess = {
  session: Awaited<ReturnType<typeof requireMembership>>;
  reservation: TenantReservationDetail;
};

/**
 * Loads one reservation for the Host tenant. Invalid / missing / cross-tenant → null (→ 404).
 * Runs targeted lazy expiry for this reservation before read.
 */
export async function getTenantReservationById(
  rawId: string,
): Promise<TenantReservationAccess | null> {
  const idParsed = reservationIdSchema.safeParse(rawId);
  if (!idParsed.success) {
    return null;
  }
  const reservationId = idParsed.data;
  const session = await requireMembership();
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const creatorProfiles = alias(profiles, "reservation_detail_creator_profiles");
  const creatorMemberships = alias(memberships, "reservation_detail_creator_memberships");

  const row = await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    await expireStaleReservations(db, {
      tenantId,
      actorProfileId: profileId,
      reservationId,
    });

    const [found] = await db
      .select({
        id: reservations.id,
        tenantId: reservations.tenantId,
        status: reservations.status,
        createdAt: reservations.createdAt,
        expiresAt: reservations.expiresAt,
        createdBy: reservations.createdBy,
        vehicleId: vehicles.id,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
        vehicleStatus: vehicles.status,
        vehicleTenantId: vehicles.tenantId,
        creatorName: creatorProfiles.name,
        creatorRole: creatorMemberships.role,
      })
      .from(reservations)
      .leftJoin(
        vehicles,
        and(eq(vehicles.id, reservations.vehicleId), eq(vehicles.tenantId, tenantId)),
      )
      .leftJoin(creatorProfiles, eq(creatorProfiles.id, reservations.createdBy))
      .leftJoin(
        creatorMemberships,
        and(
          eq(creatorMemberships.profileId, reservations.createdBy),
          eq(creatorMemberships.tenantId, tenantId),
        ),
      )
      .where(and(eq(reservations.id, reservationId), eq(reservations.tenantId, tenantId)))
      .limit(1);

    return found ?? null;
  });

  if (!row || row.tenantId !== tenantId) {
    return null;
  }

  const displayName = creatorDisplayName(
    row.creatorName,
    row.creatorRole as MembershipRole | null,
  );

  return {
    session,
    reservation: {
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      vehicle:
        row.vehicleId && row.vehicleTenantId === tenantId
          ? {
              id: row.vehicleId,
              make: row.vehicleMake!,
              model: row.vehicleModel!,
              status: row.vehicleStatus!,
            }
          : null,
      creator: displayName ? { displayName } : null,
    },
  };
}

/**
 * Finds the active reservation for a vehicle in the Host tenant.
 * Runs targeted lazy expiry for the vehicle first so stale holds do not linger.
 * Returns null when none (or after expiry freed the hold). Does not expose cross-tenant rows.
 */
export async function getActiveReservationIdForVehicle(
  rawVehicleId: string,
): Promise<string | null> {
  const vehicleParsed = vehicleIdSchema.safeParse(rawVehicleId);
  if (!vehicleParsed.success) {
    return null;
  }
  const vehicleId = vehicleParsed.data;
  const session = await requireMembership();
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  return withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    await expireStaleReservations(db, {
      tenantId,
      actorProfileId: profileId,
      vehicleId,
    });

    const [found] = await db
      .select({
        id: reservations.id,
        tenantId: reservations.tenantId,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.tenantId, tenantId),
          eq(reservations.vehicleId, vehicleId),
          eq(reservations.status, "active"),
        ),
      )
      .limit(1);

    if (!found || found.tenantId !== tenantId) {
      return null;
    }
    return found.id;
  });
}
