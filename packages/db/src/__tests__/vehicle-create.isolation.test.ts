/**
 * 4C — vehicle create isolation under withTenantContext + audit.
 * Requires DATABASE_URL + SEED_PROFILE_*_ID.
 */

import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { withTenantContext } from "../rls";
import { writeAuditLog } from "../audit";
import { seedDevTenants } from "../seed/dev-tenants";
import { vehicles } from "../schema/vehicles";

const canRunOnline =
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.SEED_PROFILE_A_ID?.trim()) &&
  Boolean(process.env.SEED_PROFILE_B_ID?.trim());

describe.skipIf(!canRunOnline)("vehicle create isolation (4C)", () => {
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

  it("vehicle created for tenant A is not returned in tenant B filtered list", async () => {
    const slug = `4c-iso-${Date.now().toString(36)}`;

    const created = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) => {
        const rows = await tx
          .insert(vehicles)
          .values({
            tenantId: tenantAId,
            status: "draft",
            slug,
            make: "Isolation",
            model: "Probe",
            year: 2024,
            mileage: 1,
            price: "1000.00",
            currency: "EUR",
            specs: {},
          })
          .returning({ id: vehicles.id, tenantId: vehicles.tenantId });

        const row = rows[0];
        if (!row) {
          throw new Error("insert returned no row");
        }

        await writeAuditLog(tx, {
          tenantId: tenantAId,
          actorProfileId: profileA,
          action: "vehicle.create",
          entityType: "vehicle",
          entityId: row.id,
          metadata: { slug, stage: "4c" },
        });

        return row;
      },
    );

    expect(created.tenantId).toBe(tenantAId);

    const listedOnB = await withTenantContext(
      db,
      { profileId: profileB, tenantId: tenantBId },
      async (tx) =>
        tx
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(and(eq(vehicles.tenantId, tenantBId), eq(vehicles.id, created.id))),
    );
    expect(listedOnB).toHaveLength(0);

    const listedOnA = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx
          .select({ id: vehicles.id, tenantId: vehicles.tenantId })
          .from(vehicles)
          .where(and(eq(vehicles.tenantId, tenantAId), eq(vehicles.id, created.id))),
    );
    expect(listedOnA).toHaveLength(1);
    expect(listedOnA[0]?.tenantId).toBe(tenantAId);
  });
});
