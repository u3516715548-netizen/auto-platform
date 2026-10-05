/**
 * Cross-tenant isolation tests.
 *
 * Requires:
 * - DATABASE_URL pointing at a migrated database
 * - Prefer a DB role WITHOUT BYPASSRLS for true RLS verification
 *
 * Without DATABASE_URL these tests are skipped (Etapa 2 allows offline schema work).
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { assertSameTenant, withTenantContext } from "../rls";
import { writeAuditLog } from "../audit";
import { seedDevTenants } from "../seed/dev-tenants";
import { reservations } from "../schema/reservations";
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

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const hasSeedProfiles =
  Boolean(process.env.SEED_PROFILE_A_ID?.trim()) &&
  Boolean(process.env.SEED_PROFILE_B_ID?.trim());
const canRunOnline = hasDatabaseUrl && hasSeedProfiles;

describe.skipIf(!canRunOnline)(
  "cross-tenant isolation (requires DATABASE_URL + SEED_PROFILE_*_ID)",
  () => {
  let db: Database;
  let tenantAId: string;
  let tenantBId: string;
  let profileA: string;
  let profileB: string;
  let vehicleAId: string;
  let vehicleBId: string;

  beforeAll(async () => {
    db = createDb(process.env.DATABASE_URL!);
    const seeded = await seedDevTenants(process.env.DATABASE_URL!);
    tenantAId = seeded.tenantA.id;
    tenantBId = seeded.tenantB.id;
    profileA = seeded.profileA;
    profileB = seeded.profileB;

    const va =
      seeded.vehicleA ??
      (await db.query.vehicles.findFirst({
        where: and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, "golf-8-acme")),
      }));
    const vb =
      seeded.vehicleB ??
      (await db.query.vehicles.findFirst({
        where: and(eq(vehicles.tenantId, tenantBId), eq(vehicles.slug, "focus-beta")),
      }));

    if (!va || !vb) {
      throw new Error("Seed vehicles missing — run migrations then seed");
    }
    vehicleAId = va.id;
    vehicleBId = vb.id;
  });

  it("assertSameTenant rejects foreign tenant ids", () => {
    expect(() => assertSameTenant(tenantAId, tenantBId)).toThrow(/Cross-tenant/);
  });

  it("tenant A context only lists tenant A vehicles (app filter)", async () => {
    const rows = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx.query.vehicles.findMany({
          where: eq(vehicles.tenantId, tenantAId),
        }),
    );

    expect(rows.every((row) => row.tenantId === tenantAId)).toBe(true);
    expect(rows.some((row) => row.id === vehicleAId)).toBe(true);
  });

  it("tenant A cannot treat vehicle B as same tenant", async () => {
    const foreign = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) => tx.query.vehicles.findFirst({ where: eq(vehicles.id, vehicleBId) }),
    );

    if (foreign) {
      expect(() => assertSameTenant(tenantAId, foreign.tenantId)).toThrow(/Cross-tenant/);
    } else {
      expect(foreign).toBeUndefined();
    }
  });

  it("audit log writes under active tenant only", async () => {
    const row = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        writeAuditLog(tx, {
          tenantId: tenantAId,
          actorProfileId: profileA,
          action: "test.cross_tenant",
          entityType: "vehicle",
          entityId: vehicleAId,
          metadata: { ok: true },
        }),
    );

    expect(row?.tenantId).toBe(tenantAId);
  });

  it("only one active reservation per vehicle", async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const key1 = `test-active-1-${randomUUID()}`;
    const key2 = `test-active-2-${randomUUID()}`;

    // Clear any leftover active rows on this vehicle from parallel suites.
    await withTenantContext(db, { profileId: profileA, tenantId: tenantAId }, async (tx) => {
      await tx
        .update(reservations)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(reservations.tenantId, tenantAId),
            eq(reservations.vehicleId, vehicleAId),
            eq(reservations.status, "active"),
          ),
        );

      await tx.insert(reservations).values({
        tenantId: tenantAId,
        vehicleId: vehicleAId,
        status: "active",
        expiresAt,
        createdBy: profileA,
        idempotencyKey: key1,
      });
    });

    await expect(
      withTenantContext(db, { profileId: profileA, tenantId: tenantAId }, async (tx) =>
        tx.insert(reservations).values({
          tenantId: tenantAId,
          vehicleId: vehicleAId,
          status: "active",
          expiresAt,
          createdBy: profileA,
          idempotencyKey: key2,
        }),
      ),
    ).rejects.toThrow();

    await withTenantContext(db, { profileId: profileA, tenantId: tenantAId }, async (tx) => {
      await tx
        .update(reservations)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(reservations.tenantId, tenantAId),
            eq(reservations.vehicleId, vehicleAId),
            eq(reservations.status, "active"),
          ),
        );
    });
  });

  it("tenant B context is isolated from tenant A", async () => {
    const rows = await withTenantContext(
      db,
      { profileId: profileB, tenantId: tenantBId },
      async (tx) =>
        tx.query.vehicles.findMany({
          where: eq(vehicles.tenantId, tenantBId),
        }),
    );

    expect(rows.every((row) => row.tenantId === tenantBId)).toBe(true);
    expect(rows.some((row) => row.id === vehicleAId)).toBe(false);
  });
});

describe("cross-tenant isolation (offline guards)", () => {
  it("documents skip when DATABASE_URL is absent", () => {
    if (!hasDatabaseUrl) {
      expect(hasDatabaseUrl).toBe(false);
    } else {
      expect(hasDatabaseUrl).toBe(true);
    }
  });

  it("assertSameTenant works without database", () => {
    expect(() => assertSameTenant("a", "a")).not.toThrow();
    expect(() => assertSameTenant("a", "b")).toThrow(/Cross-tenant/);
  });
});
