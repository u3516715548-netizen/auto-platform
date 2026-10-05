import { describe, expect, it } from "vitest";
import { buildVehicleMediaStoragePath, parseVehicleMediaStoragePath } from "../storage-path";

const TENANT = "00000000-0000-4000-8000-000000000001";
const VEHICLE = "00000000-0000-4000-8000-000000000002";
const MEDIA = "00000000-0000-4000-8000-000000000003";

describe("vehicle media storage path", () => {
  it("builds deterministic server-side path", () => {
    const path = buildVehicleMediaStoragePath({
      tenantId: TENANT,
      vehicleId: VEHICLE,
      mediaId: MEDIA,
      contentType: "image/jpeg",
    });
    expect(path).toBe(`${TENANT}/${VEHICLE}/${MEDIA}.jpg`);
  });

  it("parses valid paths only", () => {
    const path = `${TENANT}/${VEHICLE}/${MEDIA}.webp`;
    expect(parseVehicleMediaStoragePath(path)).toEqual({
      tenantId: TENANT,
      vehicleId: VEHICLE,
      mediaId: MEDIA,
      ext: "webp",
    });
    expect(parseVehicleMediaStoragePath("../evil")).toBeNull();
    expect(parseVehicleMediaStoragePath(`${TENANT}/not-uuid/${MEDIA}.jpg`)).toBeNull();
  });
});
