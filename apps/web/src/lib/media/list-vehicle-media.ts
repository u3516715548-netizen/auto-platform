import { and, asc, eq } from "drizzle-orm";
import { getDb, vehicleMedia, withTenantContext } from "@auto-platform/db";
import { createSignedDownloadUrls } from "./sign-storage-url";
import type { StaffMediaSession } from "./vehicle-media-access";

export type DashboardVehicleMediaItem = {
  id: string;
  sortOrder: number;
  altText: string | null;
  isCover: boolean;
  url: string | null;
};

export async function listDashboardVehicleMedia(
  session: StaffMediaSession,
  vehicleId: string,
): Promise<DashboardVehicleMediaItem[]> {
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const rows = await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    return db
      .select({
        id: vehicleMedia.id,
        storagePath: vehicleMedia.storagePath,
        sortOrder: vehicleMedia.sortOrder,
        altText: vehicleMedia.altText,
        vehicleId: vehicleMedia.vehicleId,
        tenantId: vehicleMedia.tenantId,
      })
      .from(vehicleMedia)
      .where(and(eq(vehicleMedia.vehicleId, vehicleId), eq(vehicleMedia.tenantId, tenantId)))
      .orderBy(asc(vehicleMedia.sortOrder), asc(vehicleMedia.createdAt));
  });

  const filtered = rows.filter((r) => r.tenantId === tenantId && r.vehicleId === vehicleId);
  const minSort =
    filtered.length > 0 ? Math.min(...filtered.map((r) => r.sortOrder)) : null;

  const urlByPath = await createSignedDownloadUrls(filtered.map((r) => r.storagePath));

  return filtered.map((row) => ({
    id: row.id,
    sortOrder: row.sortOrder,
    altText: row.altText,
    isCover: minSort !== null && row.sortOrder === minSort,
    url: urlByPath.get(row.storagePath) ?? null,
  }));
}
