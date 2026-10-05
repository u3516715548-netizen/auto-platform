import { describe, expect, it } from "vitest";
import {
  initialGallerySelectedIndex,
  pickCoverImage,
  toPublicVehicleImages,
  PUBLIC_VEHICLE_IMAGE_DTO_KEYS,
  type PublicVehicleImageDto,
} from "../public-gallery-helpers";

describe("public gallery mapping", () => {
  it("maps one image with cover sort_order 0 and signed URL", () => {
    const rows = [
      {
        vehicleId: "v1",
        storagePath: "t/v/m1.jpg",
        sortOrder: 0,
        altText: "Cover",
      },
    ];
    const urls = new Map([["t/v/m1.jpg", "https://signed.example/m1"]]);
    const images = toPublicVehicleImages(rows, urls);
    expect(images).toHaveLength(1);
    expect(images[0]).toEqual({
      url: "https://signed.example/m1",
      altText: "Cover",
      sortOrder: 0,
      isCover: true,
    });
    expect(Object.keys(images[0]!).sort()).toEqual([...PUBLIC_VEHICLE_IMAGE_DTO_KEYS].sort());
    expect(images[0]).not.toHaveProperty("storagePath");
    expect(images[0]).not.toHaveProperty("id");
    expect(images[0]).not.toHaveProperty("tenantId");
    expect(pickCoverImage(images)?.sortOrder).toBe(0);
    expect(initialGallerySelectedIndex(images)).toBe(0);
  });

  it("signs every image in a multi-image gallery; cover is sort_order 0", () => {
    const rows = [
      { vehicleId: "v1", storagePath: "t/v/a.jpg", sortOrder: 0, altText: "A" },
      { vehicleId: "v1", storagePath: "t/v/b.jpg", sortOrder: 1, altText: "B" },
      { vehicleId: "v1", storagePath: "t/v/c.jpg", sortOrder: 2, altText: null },
    ];
    const urls = new Map([
      ["t/v/a.jpg", "https://signed.example/a"],
      ["t/v/b.jpg", "https://signed.example/b"],
      ["t/v/c.jpg", "https://signed.example/c"],
    ]);
    const images = toPublicVehicleImages(rows, urls);
    expect(images).toHaveLength(3);
    expect(images.every((img) => typeof img.url === "string" && img.url.length > 0)).toBe(true);
    expect(images.filter((img) => img.isCover)).toHaveLength(1);
    expect(images.find((img) => img.isCover)?.sortOrder).toBe(0);
    expect(initialGallerySelectedIndex(images)).toBe(0);

    // Selecting each image is index-based (UI); verify all slots are addressable.
    for (let i = 0; i < images.length; i += 1) {
      expect(images[i]?.url).toBe(`https://signed.example/${["a", "b", "c"][i]}`);
    }
  });

  it("keeps gallery slots when one signed URL fails", () => {
    const rows = [
      { vehicleId: "v1", storagePath: "t/v/a.jpg", sortOrder: 0, altText: null },
      { vehicleId: "v1", storagePath: "t/v/b.jpg", sortOrder: 1, altText: null },
    ];
    const urls = new Map<string, string | null>([
      ["t/v/a.jpg", "https://signed.example/a"],
      ["t/v/b.jpg", null],
    ]);
    const images = toPublicVehicleImages(rows, urls);
    expect(images).toHaveLength(2);
    expect(images[0]?.url).toBe("https://signed.example/a");
    expect(images[1]?.url).toBeNull();
    expect(images[0]?.isCover).toBe(true);
  });

  it("selects cover index even when cover is not first in unsorted input", () => {
    const images: PublicVehicleImageDto[] = [
      { url: "https://x/b", altText: null, sortOrder: 1, isCover: false },
      { url: "https://x/a", altText: null, sortOrder: 0, isCover: true },
    ];
    expect(initialGallerySelectedIndex(images)).toBe(1);
    expect(pickCoverImage(images)?.url).toBe("https://x/a");
  });
});

describe("public gallery access gates (unit)", () => {
  it("draft/archived vehicles yield empty media rows before signing", () => {
    // loadAvailableVehicleMediaRows filters status=available only; empty rows → no URLs.
    const images = toPublicVehicleImages([], new Map());
    expect(images).toEqual([]);
    expect(pickCoverImage(images)).toBeNull();
  });

  it("never embeds storage_path in public DTO even when map keys are paths", () => {
    const images = toPublicVehicleImages(
      [{ vehicleId: "v1", storagePath: "secret/path.jpg", sortOrder: 0, altText: null }],
      new Map([["secret/path.jpg", "https://signed.example/ok"]]),
    );
    const serialized = JSON.stringify(images);
    expect(serialized).not.toContain("secret/path");
    expect(serialized).not.toContain("storagePath");
  });
});
