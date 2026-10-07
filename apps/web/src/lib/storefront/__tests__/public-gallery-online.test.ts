import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  getPublicVehicleDetailBySlug,
  listPublicVehiclesForCatalog,
} from "../public-vehicles";
import { loadPublicTenantBySlug } from "../resolve-public-tenant";
import { listPublicVehicleImagesForAvailable } from "../public-vehicle-media";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("public gallery online (DATABASE_URL)", () => {
  it.skipIf(!hasDb)("available vehicles may expose signed image slots; draft has none", async () => {
    const acme = await loadPublicTenantBySlug("acme");
    expect(acme.kind).toBe("ok");
    if (acme.kind !== "ok") return;

    const catalog = await listPublicVehiclesForCatalog(acme.tenant.tenantId);
    expect(catalog.items.some((v) => v.slug === "koenigsegg-ccx")).toBe(true);
    expect(catalog.items.some((v) => v.slug === "golf-8-acme")).toBe(false);
    expect(catalog.items.some((v) => v.slug === "draft-incomplet-acme")).toBe(false);

    for (const row of catalog.items) {
      if (row.coverImage) {
        expect(Object.keys(row.coverImage).sort()).toEqual([
          "altText",
          "isCover",
          "sortOrder",
          "url",
        ]);
        expect(row.coverImage).not.toHaveProperty("storagePath");
        expect(row.coverImage).not.toHaveProperty("id");
      }
    }

    const detail = await getPublicVehicleDetailBySlug(acme.tenant.tenantId, "koenigsegg-ccx");
    expect(detail).not.toBeNull();
    if (!detail) return;

    // All images (0..n) are listed; URLs come from server signing (may be null if Storage unset).
    for (const image of detail.images) {
      expect(image).not.toHaveProperty("storagePath");
      expect(image).not.toHaveProperty("id");
      expect(image).not.toHaveProperty("tenantId");
      expect(typeof image.sortOrder).toBe("number");
    }

    if (detail.images.length >= 2) {
      const cover = detail.images.find((i) => i.isCover);
      expect(cover?.sortOrder).toBe(Math.min(...detail.images.map((i) => i.sortOrder)));
      expect(detail.images.filter((i) => i.isCover)).toHaveLength(1);
    }

    const draftNull = await getPublicVehicleDetailBySlug(
      acme.tenant.tenantId,
      "draft-incomplet-acme",
    );
    expect(draftNull).toBeNull();
  });

  it.skipIf(!hasDb)("cross-tenant media listing stays empty for foreign vehicle id", async () => {
    const acme = await loadPublicTenantBySlug("acme");
    const beta = await loadPublicTenantBySlug("beta");
    expect(acme.kind).toBe("ok");
    expect(beta.kind).toBe("ok");
    if (acme.kind !== "ok" || beta.kind !== "ok") return;

    const { getDb, vehicles } = await import("@auto-platform/db");
    const db = getDb();
    const [betaVehicle] = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.tenantId, beta.tenant.tenantId), eq(vehicles.slug, "focus-beta")))
      .limit(1);

    expect(betaVehicle?.id).toBeTruthy();
    if (!betaVehicle) return;

    // ACME tenant asking for BETA vehicle id → no available media in ACME scope.
    const leaked = await listPublicVehicleImagesForAvailable(
      acme.tenant.tenantId,
      betaVehicle.id,
    );
    expect(leaked).toEqual([]);
  });
});
