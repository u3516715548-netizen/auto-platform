import { describe, expect, it } from "vitest";
import { listPublicVehiclesForCatalog } from "../public-vehicles";
import { loadPublicTenantBySlug } from "../resolve-public-tenant";
import { CATALOG_PAGE_SIZE } from "../catalog-query";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("Etapa 8A public catalog query online (DATABASE_URL)", () => {
  it.skipIf(!hasDb)("filters available ACME only; ignores draft and foreign tenant", async () => {
    const acme = await loadPublicTenantBySlug("acme");
    const beta = await loadPublicTenantBySlug("beta");
    expect(acme.kind).toBe("ok");
    expect(beta.kind).toBe("ok");
    if (acme.kind !== "ok" || beta.kind !== "ok") return;

    const all = await listPublicVehiclesForCatalog(acme.tenant.tenantId, {});
    expect(all.pageSize).toBe(CATALOG_PAGE_SIZE);
    expect(all.items.every((v) => typeof v.slug === "string")).toBe(true);
    expect(all.items.some((v) => v.slug === "golf-8-acme")).toBe(true);
    expect(all.items.some((v) => v.slug === "draft-incomplet-acme")).toBe(false);
    expect(all.items.some((v) => v.slug === "focus-beta")).toBe(false);

    for (const item of all.items) {
      expect(item).not.toHaveProperty("id");
      expect(item).not.toHaveProperty("vin");
      expect(item).not.toHaveProperty("tenantId");
      expect(item).not.toHaveProperty("status");
    }

    const golf = await listPublicVehiclesForCatalog(acme.tenant.tenantId, {
      q: "golf",
      sort: "newest",
      page: 1,
    });
    expect(golf.total).toBeGreaterThanOrEqual(1);
    expect(golf.items.some((v) => v.slug === "golf-8-acme")).toBe(true);
    expect(golf.items.some((v) => v.slug === "draft-incomplet-acme")).toBe(false);

    const diesel = await listPublicVehiclesForCatalog(acme.tenant.tenantId, {
      fuel: ["diesel"],
      page: 1,
      sort: "newest",
    });
    expect(diesel.items.every((v) => v.fuel === "diesel")).toBe(true);
    // Seed golf is diesel available
    expect(diesel.items.some((v) => v.slug === "golf-8-acme")).toBe(true);

    const betaList = await listPublicVehiclesForCatalog(beta.tenant.tenantId, {
      q: "golf",
      page: 1,
      sort: "newest",
    });
    expect(betaList.items.some((v) => v.slug === "golf-8-acme")).toBe(false);

    const smuggled = await listPublicVehiclesForCatalog(acme.tenant.tenantId, {
      q: "golf",
      tenant_id: beta.tenant.tenantId,
      status: "draft",
      page: 1,
    } as Record<string, string>);
    expect(smuggled.items.some((v) => v.slug === "golf-8-acme")).toBe(true);
    expect(smuggled.items.every((v) => v.slug !== "draft-incomplet-acme")).toBe(true);
  });

  it.skipIf(!hasDb)("paginates with fixed pageSize and clamps page", async () => {
    const acme = await loadPublicTenantBySlug("acme");
    expect(acme.kind).toBe("ok");
    if (acme.kind !== "ok") return;

    const page1 = await listPublicVehiclesForCatalog(acme.tenant.tenantId, {
      page: 1,
      sort: "newest",
    });
    expect(page1.items.length).toBeLessThanOrEqual(CATALOG_PAGE_SIZE);
    expect(page1.page).toBe(1);

    const huge = await listPublicVehiclesForCatalog(acme.tenant.tenantId, {
      page: 9999,
      sort: "newest",
    });
    expect(huge.page).toBe(huge.totalPages);
    expect(huge.items.length).toBeLessThanOrEqual(CATALOG_PAGE_SIZE);
  });
});
