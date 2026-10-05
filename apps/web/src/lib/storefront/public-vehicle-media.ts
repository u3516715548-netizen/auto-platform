import { and, asc, eq, inArray } from "drizzle-orm";
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

export async function attachPublicCoverImages(
  tenantId: string,
  items: PublicVehicleDto[],
): Promise<PublicVehicleCatalogDto[]> {
  if (items.length === 0) return [];

  const vehicleIds = await resolveVehicleIdsBySlugs(
    tenantId,
    items.map((v) => v.slug),
  );
  const idBySlug = new Map(vehicleIds.map((v) => [v.slug, v.id]));

  const mediaRows = await loadAvailableVehicleMediaRows(tenantId, [...idBySlug.values()]);
  const byVehicle = new Map<string, MediaRow[]>();
  for (const row of mediaRows) {
    const list = byVehicle.get(row.vehicleId) ?? [];
    list.push(row);
    byVehicle.set(row.vehicleId, list);
  }

  const coverPaths = [...byVehicle.values()]
    .map((rows) => (rows.length > 0 ? rows[0]!.storagePath : null))
    .filter((p): p is string => Boolean(p));
  const urlByPath = await createSignedDownloadUrls(coverPaths);

  return items.map((vehicle) => {
    const vehicleId = idBySlug.get(vehicle.slug);
    const rows = vehicleId ? (byVehicle.get(vehicleId) ?? []) : [];
    const images = toPublicVehicleImages(rows.slice(0, 1), urlByPath);
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

async function resolveVehicleIdsBySlugs(
  tenantId: string,
  slugs: string[],
): Promise<Array<{ slug: string; id: string }>> {
  if (slugs.length === 0) return [];
  const db = getDb();
  await clearPublicSessionGucs(db);
  const rows = await db
    .select({ id: vehicles.id, slug: vehicles.slug, status: vehicles.status })
    .from(vehicles)
    .where(and(eq(vehicles.tenantId, tenantId), inArray(vehicles.slug, slugs)));
  return rows
    .filter((r) => r.status === "available")
    .map((r) => ({ slug: r.slug, id: r.id }));
}
