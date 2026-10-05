/**
 * 4E — archived list exclusion + reactivation under tenant context.
 */

import { and, eq, ne } from "drizzle-orm";
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

describe.skipIf(!canRunOnline)("vehicle archive list + reactivation (4E)", () => {
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

  it("archived vehicles are excluded from active list and can be reactivated", async () => {
    const slug = `4e-arch-${Date.now().toString(36)}`;

    const vehicleId = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) => {
        const rows = await tx
          .insert(vehicles)
          .values({
            tenantId: tenantAId,
            status: "available",
            slug,
            make: "Archive",
            model: "Flow",
            year: 2021,
            mileage: 12,
            price: "9000.00",
            currency: "EUR",
            specs: {},
          })
          .returning({ id: vehicles.id });
        const row = rows[0];
        if (!row) throw new Error("insert returned no row");

        await tx
          .update(vehicles)
          .set({ status: "archived", updatedAt: new Date() })
          .where(and(eq(vehicles.id, row.id), eq(vehicles.tenantId, tenantAId)));

        await writeAuditLog(tx, {
          tenantId: tenantAId,
          actorProfileId: profileA,
          action: "vehicle.archive",
          entityType: "vehicle",
          entityId: row.id,
          metadata: { stage: "4e" },
        });

        return row.id;
      },
    );

    const active = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(
            and(
              eq(vehicles.tenantId, tenantAId),
              ne(vehicles.status, "archived"),
              eq(vehicles.id, vehicleId),
            ),
          ),
    );
    expect(active).toHaveLength(0);

    const archived = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx
          .select({ id: vehicles.id, status: vehicles.status })
          .from(vehicles)
          .where(
            and(
              eq(vehicles.tenantId, tenantAId),
              eq(vehicles.status, "archived"),
              eq(vehicles.id, vehicleId),
            ),
          ),
    );
    expect(archived).toHaveLength(1);

    await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) => {
        await tx
          .update(vehicles)
          .set({ status: "draft", updatedAt: new Date() })
          .where(and(eq(vehicles.id, vehicleId), eq(vehicles.tenantId, tenantAId)));

        await writeAuditLog(tx, {
          tenantId: tenantAId,
          actorProfileId: profileA,
          action: "vehicle.status_change",
          entityType: "vehicle",
          entityId: vehicleId,
          metadata: { from: "archived", to: "draft", stage: "4e-reactivate" },
        });
      },
    );

    const reactivated = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx
          .select({ id: vehicles.id, status: vehicles.status })
          .from(vehicles)
          .where(
            and(
              eq(vehicles.tenantId, tenantAId),
              ne(vehicles.status, "archived"),
              eq(vehicles.id, vehicleId),
            ),
          ),
    );
    expect(reactivated).toHaveLength(1);
    expect(reactivated[0]?.status).toBe("draft");

    const onB = await withTenantContext(
      db,
      { profileId: profileB, tenantId: tenantBId },
      async (tx) =>
        tx
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(and(eq(vehicles.tenantId, tenantBId), eq(vehicles.id, vehicleId))),
    );
    expect(onB).toHaveLength(0);
  });
});
