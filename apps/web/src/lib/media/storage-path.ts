import type { VehicleImageMime } from "@auto-platform/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function mimeToExtension(mime: VehicleImageMime): "jpg" | "png" | "webp" {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

/** Server-only object key: {tenantId}/{vehicleId}/{mediaId}.{ext} */
export function buildVehicleMediaStoragePath(input: {
  tenantId: string;
  vehicleId: string;
  mediaId: string;
  contentType: VehicleImageMime;
}): string {
  if (!UUID_RE.test(input.tenantId)) {
    throw new Error("tenantId invalid");
  }
  if (!UUID_RE.test(input.vehicleId)) {
    throw new Error("vehicleId invalid");
  }
  if (!UUID_RE.test(input.mediaId)) {
    throw new Error("mediaId invalid");
  }
  const ext = mimeToExtension(input.contentType);
  return `${input.tenantId}/${input.vehicleId}/${input.mediaId}.${ext}`;
}

export function parseVehicleMediaStoragePath(path: string): {
  tenantId: string;
  vehicleId: string;
  mediaId: string;
  ext: string;
} | null {
  const match = path.match(
    /^([0-9a-f-]{36})\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|png|webp)$/i,
  );
  if (!match) return null;
  const [, tenantId, vehicleId, mediaId, ext] = match;
  if (!tenantId || !vehicleId || !mediaId || !ext) return null;
  if (!UUID_RE.test(tenantId) || !UUID_RE.test(vehicleId) || !UUID_RE.test(mediaId)) {
    return null;
  }
  return { tenantId, vehicleId, mediaId, ext: ext.toLowerCase() };
}

/** Rejects client-supplied storage paths / tenant segments. */
export function rejectClientStoragePath(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return true;
}
