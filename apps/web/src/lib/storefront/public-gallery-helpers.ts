/**
 * Pure public gallery helpers — safe for Client Components.
 * No DB / Storage / next/headers imports.
 */

export type PublicVehicleImageDto = {
  url: string | null;
  altText: string | null;
  sortOrder: number;
  isCover: boolean;
};

export const PUBLIC_VEHICLE_IMAGE_DTO_KEYS = [
  "url",
  "altText",
  "sortOrder",
  "isCover",
] as const;

type MediaRow = {
  vehicleId: string;
  storagePath: string;
  sortOrder: number;
  altText: string | null;
};

/** Pure helper: map DB rows + signed URL map → public image DTOs (no storage_path). */
export function toPublicVehicleImages(
  rows: MediaRow[],
  urlByPath: Map<string, string | null>,
): PublicVehicleImageDto[] {
  if (rows.length === 0) return [];
  const minSort = Math.min(...rows.map((r) => r.sortOrder));
  return rows.map((row) => ({
    url: urlByPath.get(row.storagePath) ?? null,
    altText: row.altText,
    sortOrder: row.sortOrder,
    isCover: row.sortOrder === minSort,
  }));
}

export function pickCoverImage(
  images: PublicVehicleImageDto[],
): PublicVehicleImageDto | null {
  if (images.length === 0) return null;
  return images.find((img) => img.isCover) ?? images[0] ?? null;
}

/** Initial selected index: cover (sort_order min / isCover), else 0. */
export function initialGallerySelectedIndex(images: PublicVehicleImageDto[]): number {
  if (images.length === 0) return 0;
  const coverIdx = images.findIndex((img) => img.isCover);
  return coverIdx >= 0 ? coverIdx : 0;
}
