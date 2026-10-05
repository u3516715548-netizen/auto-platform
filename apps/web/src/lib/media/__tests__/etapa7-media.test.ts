import { describe, expect, it } from "vitest";
import {
  confirmVehicleMediaUploadSchema,
  requestVehicleMediaUploadSchema,
  VEHICLE_MEDIA_MAX_BYTES,
  VEHICLE_MEDIA_MAX_IMAGES,
} from "@auto-platform/types";
import { rejectClientStoragePath } from "../storage-path";
import { PUBLIC_VEHICLE_IMAGE_DTO_KEYS } from "@/lib/storefront/public-vehicle-media";

describe("Etapa 7 media validation", () => {
  it("accepts only jpeg/png/webp under size limit", () => {
    expect(
      requestVehicleMediaUploadSchema.safeParse({
        vehicleId: "00000000-0000-4000-8000-000000000001",
        contentType: "image/jpeg",
        byteSize: 1024,
      }).success,
    ).toBe(true);
    expect(
      requestVehicleMediaUploadSchema.safeParse({
        vehicleId: "00000000-0000-4000-8000-000000000001",
        contentType: "image/svg+xml",
        byteSize: 1024,
      }).success,
    ).toBe(false);
    expect(
      requestVehicleMediaUploadSchema.safeParse({
        vehicleId: "00000000-0000-4000-8000-000000000001",
        contentType: "image/png",
        byteSize: VEHICLE_MEDIA_MAX_BYTES + 1,
      }).success,
    ).toBe(false);
  });

  it("confirm rejects tenant/path smuggling fields via strict schemas", () => {
    expect(
      confirmVehicleMediaUploadSchema.safeParse({
        vehicleId: "00000000-0000-4000-8000-000000000001",
        mediaId: "00000000-0000-4000-8000-000000000002",
        tenant_id: "evil",
      }).success,
    ).toBe(false);
    expect(rejectClientStoragePath("tenant/x/y.jpg")).toBe(true);
    expect(rejectClientStoragePath(undefined)).toBe(false);
  });

  it("public image DTO whitelist excludes storage paths and ids", () => {
    const dto = {
      url: "https://example.com/signed",
      altText: "Golf",
      sortOrder: 0,
      isCover: true,
    };
    expect(Object.keys(dto).sort()).toEqual([...PUBLIC_VEHICLE_IMAGE_DTO_KEYS].sort());
    expect(dto).not.toHaveProperty("storagePath");
    expect(dto).not.toHaveProperty("id");
    expect(VEHICLE_MEDIA_MAX_IMAGES).toBe(20);
  });
});
