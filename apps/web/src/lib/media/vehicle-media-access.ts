import { and, eq } from "drizzle-orm";
import { InsufficientRoleError } from "@auto-platform/core";
import { getDb, vehicles, withTenantContext } from "@auto-platform/db";
import { requireRole } from "@/lib/auth/require-role";
import { requireMembership } from "@/lib/auth/require-membership";
import type { MembershipRole } from "@auto-platform/types";
import { VEHICLE_MUTATION_ROLES, canMutateVehicle } from "@/lib/vehicles/permissions";

export type StaffMediaSession = Awaited<ReturnType<typeof requireMembership>>;

export async function requireStaffMediaSession() {
  return requireMembership();
}

export async function requireStaffMediaMutation() {
  try {
    return await requireRole(VEHICLE_MUTATION_ROLES);
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      throw error;
    }
    throw error;
  }
}

export async function loadVehicleForMedia(
  session: StaffMediaSession,
  vehicleId: string,
): Promise<{ tenantId: string; vehicleId: string } | null> {
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  return withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    const row = await db.query.vehicles.findFirst({
      where: and(eq(vehicles.id, vehicleId), eq(vehicles.tenantId, tenantId)),
      columns: { id: true, tenantId: true },
    });
    if (!row || row.tenantId !== tenantId) return null;
    return { tenantId, vehicleId: row.id };
  });
}

export function canManageVehicleMedia(role: MembershipRole): boolean {
  return canMutateVehicle(role);
}
