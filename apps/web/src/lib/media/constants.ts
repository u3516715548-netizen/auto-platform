import { VEHICLE_MEDIA_SIGNED_URL_TTL_SEC } from "@auto-platform/types";

export const MEDIA_BUCKET =
  process.env.NEXT_PUBLIC_MEDIA_BUCKET?.trim() || "vehicle-media";

export { VEHICLE_MEDIA_SIGNED_URL_TTL_SEC };
