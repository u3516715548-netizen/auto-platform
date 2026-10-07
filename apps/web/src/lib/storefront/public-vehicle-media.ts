import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb, vehicleMedia, vehicles } from "@auto-platform/db";
import { createSignedDownloadUrls } from "@/lib/media/sign-storage-url";
import { clearPublicSessionGucs } from "./clear-public-session";
import type { PublicVehicleDto } from "./public-dto";
import {
  pickCoverImage,
  toPublicVehicleImages,
  type PublicVehicleImageDto,
} from "./public-gallery-helpers";

export type {
  PublicVehicleImageDto,
} from "./public-gallery-helpers";
export {
  PUBLIC_VEHICLE_IMAGE_DTO_KEYS,
  initialGallerySelectedIndex,
  pickCoverImage,
  toPublicVehicleImages,
} from "./public-gallery-helpers";

export type PublicVehicleCatalogDto = PublicVehicleDto & {
  coverImage: PublicVehicleImageDto | null;
};

export type PublicVehicleDetailDto = PublicVehicleDto & {
  images: PublicVehicleImageDto[];
};

type MediaRow = {
  vehicleId: string;
  storagePath: string;
  sortOrder: number;
  altText: string | null;
};

type CoverAttachInput = {
  vehicle: PublicVehicleDto;
  /** Server-only id — never placed on the public DTO. */
  vehicleId: string;
};

async function loadAvailableVehicleMediaRows(
  tenantId: string,
  vehicleIds: string[],
): Promise<MediaRow[]> {
  if (vehicleIds.length === 0) return [];
  const db = getDb();
  await clearPublicSessionGucs(db);

  return db
    .select({
      vehicleId: vehicleMedia.vehicleId,
      storagePath: vehicleMedia.storagePath,
      sortOrder: vehicleMedia.sortOrder,
      altText: vehicleMedia.altText,
      status: vehicles.status,
      rowTenantId: vehicleMedia.tenantId,
    })
    .from(vehicleMedia)
    .innerJoin(vehicles, eq(vehicles.id, vehicleMedia.vehicleId))
    .where(
      and(
        eq(vehicleMedia.tenantId, tenantId),
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.status, "available"),
        eq(vehicleMedia.type, "image"),
        inArray(vehicleMedia.vehicleId, vehicleIds),
      ),
    )
    .orderBy(asc(vehicleMedia.sortOrder), asc(vehicleMedia.createdAt))
    .then((rows) =>
      rows
        .filter((r) => r.rowTenantId === tenantId && r.status === "available")
        .map(({ vehicleId, storagePath, sortOrder, altText }) => ({
          vehicleId,
          storagePath,
          sortOrder,
          altText,
        })),
    );
}

/**
 * One cover row per vehicle (lowest sortOrder) — avoids loading full galleries for catalog cards.
 */
async function loadAvailableCoverMediaRows(
  tenantId: string,
  vehicleIds: string[],
): Promise<MediaRow[]> {
  if (vehicleIds.length === 0) return [];
  const db = getDb();
  await clearPublicSessionGucs(db);

  const idList = sql.join(
    vehicleIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );

  const result = await db.execute(sql`
    SELECT DISTINCT ON (vm.vehicle_id)
      vm.vehicle_id AS "vehicleId",
      vm.storage_path AS "storagePath",
      vm.sort_order AS "sortOrder",
      vm.alt_text AS "altText"
    FROM vehicle_media vm
    INNER JOIN vehicles v ON v.id = vm.vehicle_id
    WHERE vm.tenant_id = ${tenantId}::uuid
      AND v.tenant_id = ${tenantId}::uuid
      AND v.status = 'available'
      AND vm.type = 'image'
      AND vm.vehicle_id IN (${idList})
    ORDER BY vm.vehicle_id, vm.sort_order ASC, vm.created_at ASC
  `);

  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: unknown }).rows ?? []);
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((raw) => {
    const r = raw as Record<string, unknown>;
    const vehicleId = typeof r.vehicleId === "string" ? r.vehicleId : null;
    const storagePath = typeof r.storagePath === "string" ? r.storagePath : null;
    const sortOrder =
      typeof r.sortOrder === "number"
        ? r.sortOrder
        : typeof r.sortOrder === "string"
          ? Number(r.sortOrder)
          : NaN;
    if (!vehicleId || !storagePath || !Number.isFinite(sortOrder)) return [];
    return [
      {
        vehicleId,
        storagePath,
        sortOrder: Math.trunc(sortOrder),
        altText: typeof r.altText === "string" ? r.altText : null,
      },
    ];
  });
}

/**
 * Attaches signed cover images using vehicle ids already loaded with the catalog rows.
 * Does not re-query vehicles by slug.
 */
export async function attachPublicCoverImages(
  tenantId: string,
  items: CoverAttachInput[],
): Promise<PublicVehicleCatalogDto[]> {
  if (items.length === 0) return [];

  const vehicleIds = items.map((item) => item.vehicleId);
  const mediaRows = await loadAvailableCoverMediaRows(tenantId, vehicleIds);
  const byVehicle = new Map<string, MediaRow>();
  for (const row of mediaRows) {
    if (!byVehicle.has(row.vehicleId)) {
      byVehicle.set(row.vehicleId, row);
    }
  }

  const coverPaths = [...byVehicle.values()].map((r) => r.storagePath);
  const urlByPath = await createSignedDownloadUrls(coverPaths);

  return items.map(({ vehicle, vehicleId }) => {
    const row = byVehicle.get(vehicleId);
    const images = row ? toPublicVehicleImages([row], urlByPath) : [];
    return { ...vehicle, coverImage: pickCoverImage(images) };
  });
}

export async function attachPublicDetailImages(
  tenantId: string,
  vehicle: PublicVehicleDto,
  vehicleId: string,
): Promise<PublicVehicleDetailDto> {
  const mediaRows = await loadAvailableVehicleMediaRows(tenantId, [vehicleId]);
  const urlByPath = await createSignedDownloadUrls(mediaRows.map((r) => r.storagePath));
  const images = toPublicVehicleImages(mediaRows, urlByPath);
  return { ...vehicle, images };
}

/**
 * Returns public images only when vehicle is available in tenant.
 * Used by tests and defensive loaders — never signs draft/archived media.
 */
export async function listPublicVehicleImagesForAvailable(
  tenantId: string,
  vehicleId: string,
): Promise<PublicVehicleImageDto[]> {
  const mediaRows = await loadAvailableVehicleMediaRows(tenantId, [vehicleId]);
  const urlByPath = await createSignedDownloadUrls(mediaRows.map((r) => r.storagePath));
  return toPublicVehicleImages(mediaRows, urlByPath);
}
