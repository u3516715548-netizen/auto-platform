/**
 * Etapa 6B — publish gate + EUR force (online).
 * Requires DATABASE_URL + SEED_PROFILE_*_ID.
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { withTenantContext } from "../rls";
import { seedDevTenants } from "../seed/dev-tenants";
import { vehicles } from "../schema/vehicles";

for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../.env.local"),
  resolve(process.cwd(), "../../apps/web/.env.local"),
]) {
  if (existsSync(candidate)) loadEnv({ path: candidate });
}

const canRunOnline =
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.SEED_PROFILE_A_ID?.trim()) &&
  Boolean(process.env.SEED_PROFILE_B_ID?.trim());

function missingPublishFields(row: {
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: string;
  fuel: string | null;
  transmission: string | null;
  bodyType: string | null;
  condition: string | null;
  powerHp: number | null;
  description: string | null;
  vatRegime: string | null;
}): string[] {
  const missing: string[] = [];
  if (!row.make) missing.push("Marcă");
  if (!row.model) missing.push("Model");
  if (!row.year) missing.push("An model");
  if (row.mileage === null || row.mileage === undefined) missing.push("Kilometraj");
  if (!row.price) missing.push("Preț");
  if (!row.fuel) missing.push("Combustibil");
  if (!row.transmission) missing.push("Transmisie");
  if (!row.bodyType) missing.push("Caroserie");
  if (!row.condition) missing.push("Stare");
  if (row.powerHp === null || row.powerHp === undefined) missing.push("Putere (CP)");
  if (!row.description || row.description.trim().length < 20) missing.push("Descriere");
  if (!row.vatRegime) missing.push("Regim TVA");
  return missing;
}

describe.skipIf(!canRunOnline)("6B publish gate + EUR (online)", () => {
  let db: Database;
  let tenantAId: string;
  let tenantBId: string;
  let profileA: string;
  let profileB: string;

  beforeAll(async () => {
    db = createDb(process.env.DATABASE_URL!);
    const seeded = await seedDevTenants(process.env.DATABASE_URL!);
    tenantAId = seeded.tenantA.id;
    tenantBId = seeded.tenantB.id;
    profileA = seeded.profileA;
    profileB = seeded.profileB;
  });

  it("draft-incomplet-acme fails publish readiness with missing labels", async () => {
    const draft = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx.query.vehicles.findFirst({
          where: and(
            eq(vehicles.tenantId, tenantAId),
            eq(vehicles.slug, "draft-incomplet-acme"),
          ),
        }),
    );
    expect(draft).toBeTruthy();
    expect(draft?.status).toBe("draft");

    const missing = missingPublishFields(draft!);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing).toContain("Combustibil");
  });

  it("golf-8-acme seed stays publish-ready fields but archived without cover", async () => {
    const golf = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, "golf-8-acme")),
        }),
    );
    expect(golf?.status).toBe("archived");
    expect(golf?.currency).toBe("EUR");
    expect(missingPublishFields(golf!)).toEqual([]);
  });

  it("showcase koenigsegg-ccx seed is publish-ready and stays available", async () => {
    const car = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, "koenigsegg-ccx")),
        }),
    );
    expect(car?.status).toBe("available");
    expect(car?.currency).toBe("EUR");
    expect(missingPublishFields(car!)).toEqual([]);
  });

  it("tenant B cannot update ACME vehicle currency/status by id", async () => {
    const golf = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, "golf-8-acme")),
        }),
    );
    expect(golf).toBeTruthy();

    const updatedOnB = await withTenantContext(
      db,
      { profileId: profileB, tenantId: tenantBId },
      async (tx) =>
        tx
          .update(vehicles)
          .set({ currency: "USD", status: "draft", updatedAt: new Date() })
          .where(and(eq(vehicles.id, golf!.id), eq(vehicles.tenantId, tenantBId)))
          .returning({ id: vehicles.id }),
    );
    expect(updatedOnB).toHaveLength(0);

    const stillA = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx.query.vehicles.findFirst({
          where: and(eq(vehicles.id, golf!.id), eq(vehicles.tenantId, tenantAId)),
        }),
    );
    expect(stillA?.currency).toBe("EUR");
    // Golf remains archived without cover (Etapa 18); status must not flip via foreign tenant.
    expect(stillA?.status).toBe("archived");
  });
});
