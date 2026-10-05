import { and, eq } from "drizzle-orm";
import { assertTenantAccess } from "@auto-platform/core";
import { getDb, vehicles, withTenantContext } from "@auto-platform/db";
import { vehicleIdSchema } from "@auto-platform/types";
import { requireMembership, type MembershipSession } from "@/lib/auth/require-membership";

export type TenantVehicle = {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: string;
  currency: string;
  status: "draft" | "available" | "reserved" | "sold" | "archived";
  createdAt: Date;
  updatedAt: Date;
};

export type TenantVehicleAccess = {
  session: MembershipSession;
  vehicle: TenantVehicle;
};

/**
 * Loads a vehicle that belongs to the Host-resolved tenant only.
 * Returns null when id is invalid, missing, or cross-tenant.
 */
export async function getTenantVehicleById(rawId: string): Promise<TenantVehicleAccess | null> {
  const idParsed = vehicleIdSchema.safeParse(rawId);
  if (!idParsed.success) {
    return null;
  }
  const vehicleId = idParsed.data;
  const session = await requireMembership();
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const row = await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    return db.query.vehicles.findFirst({
      where: and(eq(vehicles.id, vehicleId), eq(vehicles.tenantId, tenantId)),
    });
  });

  if (!row) {
    return null;
  }

  assertTenantAccess(tenantId, row.tenantId);

  return {
    session,
    vehicle: {
      id: row.id,
      slug: row.slug,
      make: row.make,
      model: row.model,
      year: row.year,
      mileage: row.mileage,
      price: row.price,
      currency: row.currency,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  };
}
