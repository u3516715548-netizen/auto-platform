import { and, desc, eq, ne } from "drizzle-orm";
import { getDb, vehicles, withTenantContext } from "@auto-platform/db";
import { requireMembership } from "@/lib/auth/require-membership";

export type VehicleListView = "active" | "archived";

export type VehicleListItem = {
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
};

/**
 * Lists vehicles for the tenant resolved from Host + membership.
 * Default view excludes soft-archived stock; `archived` view shows only archived.
 * Never accepts tenant_id from the client.
 */
export async function listTenantVehicles(
  view: VehicleListView = "active",
): Promise<VehicleListItem[]> {
  const { user, tenant } = await requireMembership();
  const tenantId = tenant.tenantId;
  const profileId = user.profile.id;

  return withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    const statusFilter =
      view === "archived"
        ? eq(vehicles.status, "archived")
        : ne(vehicles.status, "archived");

    const rows = await db
      .select({
        id: vehicles.id,
        slug: vehicles.slug,
        make: vehicles.make,
        model: vehicles.model,
        year: vehicles.year,
        mileage: vehicles.mileage,
        price: vehicles.price,
        currency: vehicles.currency,
        status: vehicles.status,
        createdAt: vehicles.createdAt,
        tenantId: vehicles.tenantId,
      })
      .from(vehicles)
      .where(and(eq(vehicles.tenantId, tenantId), statusFilter))
      .orderBy(desc(vehicles.createdAt));

    return rows
      .filter((row) => row.tenantId === tenantId)
      .filter((row) =>
        view === "archived" ? row.status === "archived" : row.status !== "archived",
      )
      .map((row) => ({
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
      }));
  });
}

export function resolveVehicleListView(raw: string | undefined): VehicleListView {
  return raw === "archived" ? "archived" : "active";
}

/** Pure helper for list filtering rules (Active excludes archived; reactivation needs status ≠ archived). */
export function matchesVehicleListView(
  status: VehicleListItem["status"],
  view: VehicleListView,
): boolean {
  return view === "archived" ? status === "archived" : status !== "archived";
}
