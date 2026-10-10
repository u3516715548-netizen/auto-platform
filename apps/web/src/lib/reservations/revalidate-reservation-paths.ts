import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, vehicles, withTenantContext } from "@auto-platform/db";
import { reservationDetailPath, vehicleEditPath } from "@/lib/dashboard/nav";
import { revalidatePublicStorefrontPaths } from "@/lib/perf/public-storefront-cache";

/**
 * Shared revalidation after reservation create / cancel / convert.
 *
 * Public paths use Next path + tenant tag revalidation (layout + optional slug page).
 * Limitation: not Host-aware for custom-domain edge caches — Etapa 12.
 * Storefront uses short `revalidate` (30s) + explicit invalidation on mutations.
 */
export function revalidateAfterReservationMutation(input: {
  reservationId: string;
  vehicleId: string;
  vehicleSlug?: string | null;
  tenantId?: string | null;
}): void {
  revalidatePath("/dashboard/reservations");
  revalidatePath(reservationDetailPath(input.reservationId));
  revalidatePath(vehicleEditPath(input.vehicleId));
  revalidatePath("/dashboard/vehicles");
  revalidatePath("/dashboard", "layout");
  revalidatePublicStorefrontPaths({
    vehicleSlug: input.vehicleSlug,
    tenantId: input.tenantId,
  });
}

/**
 * Resolves vehicle slug in tenant context for precise public path revalidation.
 */
export async function loadVehicleSlugForRevalidate(input: {
  profileId: string;
  tenantId: string;
  vehicleId: string;
}): Promise<string | null> {
  return withTenantContext(
    getDb(),
    { profileId: input.profileId, tenantId: input.tenantId },
    async (db) => {
      const [row] = await db
        .select({ slug: vehicles.slug, tenantId: vehicles.tenantId })
        .from(vehicles)
        .where(
          and(eq(vehicles.id, input.vehicleId), eq(vehicles.tenantId, input.tenantId)),
        )
        .limit(1);
      if (!row || row.tenantId !== input.tenantId) return null;
      return row.slug;
    },
  );
}

/** Paths covered by {@link revalidateAfterReservationMutation} — for unit tests. */
export const RESERVATION_MUTATION_REVALIDATE_PATHS = [
  "/dashboard/reservations",
  "/dashboard/vehicles",
  "/dashboard",
  "/",
  "/vehicles",
] as const;
