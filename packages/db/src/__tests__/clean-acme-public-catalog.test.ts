/**
 * Etapa 18 — cleanAcmePublicCatalog online smoke.
 * Mutates Golf only inside a rolled-back transaction so parallel suites
 * (e.g. vehicle-publish-gate) never observe a shared `available` Golf.
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { seedDevTenants } from "../seed/dev-tenants";
import { vehicles } from "../schema/vehicles";
import {
  ACME_SHOWCASE_SLUGS,
  cleanAcmePublicCatalog,
} from "../demo/clean-acme-public-catalog";

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

class IntentionalCleanupRollback extends Error {
  constructor() {
    super("clean-acme-catalog-test-rollback");
    this.name = "IntentionalCleanupRollback";
  }
}

describe.skipIf(!canRunOnline)("cleanAcmePublicCatalog (Etapa 18)", () => {
  let db: Database;
  let tenantAId: string;

  beforeAll(async () => {
    db = createDb(process.env.DATABASE_URL!);
    const seeded = await seedDevTenants(process.env.DATABASE_URL!);
    tenantAId = seeded.tenantA.id;
  });

  afterAll(async () => {
    // Leave shared ACME catalog clean for other suites (Golf archived, showcase available).
    await cleanAcmePublicCatalog(db);
  });

  it("archives Golf + fixture Test Reservation; keeps showcase; idempotent", async () => {
    const pollutionSlug = `e11a-res-${randomUUID().slice(0, 8)}`;

    try {
      await db.transaction(async (tx) => {
        const scoped = tx as unknown as Database;

        await scoped.insert(vehicles).values({
          tenantId: tenantAId,
          status: "available",
          slug: pollutionSlug,
          make: "Test",
          model: "Reservation",
          year: 2020,
          mileage: 1000,
          price: "10000.00",
          currency: "EUR",
          specs: {},
        });

        // Exercise Golf archive path without committing to the shared DB.
        await scoped
          .update(vehicles)
          .set({ status: "available", updatedAt: new Date() })
          .where(and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, "golf-8-acme")));

        const first = await cleanAcmePublicCatalog(scoped);
        expect(first.tenantSlug).toBe("acme");
        expect(first.archivedSlugs).toContain(pollutionSlug);
        expect(first.archivedSlugs).toContain("golf-8-acme");
        for (const slug of ACME_SHOWCASE_SLUGS) {
          expect(first.availableSlugs).toContain(slug);
        }
        expect(first.availableSlugs).not.toContain("golf-8-acme");
        expect(first.availableSlugs).not.toContain(pollutionSlug);

        const golf = await scoped.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, "golf-8-acme")),
        });
        expect(golf?.status).toBe("archived");

        const pollution = await scoped.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, pollutionSlug)),
        });
        expect(pollution?.status).toBe("archived");

        const second = await cleanAcmePublicCatalog(scoped);
        for (const slug of ACME_SHOWCASE_SLUGS) {
          expect(second.availableSlugs).toContain(slug);
        }
        expect(second.archivedSlugs).not.toContain(pollutionSlug);

        throw new IntentionalCleanupRollback();
      });
    } catch (error) {
      if (!(error instanceof IntentionalCleanupRollback)) {
        throw error;
      }
    }

    // Shared DB: Golf must remain archived (seed + Etapa 18 cleanup contract).
    const shared = await cleanAcmePublicCatalog(db);
    expect(shared.availableSlugs).not.toContain("golf-8-acme");
    const golfShared = await db.query.vehicles.findFirst({
      where: and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, "golf-8-acme")),
    });
    expect(golfShared?.status).toBe("archived");
  });
});
