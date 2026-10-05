/**
 * 4D — update / status / archive isolation + audit actions.
 * Requires DATABASE_URL + SEED_PROFILE_*_ID.
 */

import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { withTenantContext } from "../rls";
import { writeAuditLog } from "../audit";
import { seedDevTenants } from "../seed/dev-tenants";
import { auditLogs } from "../schema/audit-logs";
import { vehicles } from "../schema/vehicles";

const canRunOnline =
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.SEED_PROFILE_A_ID?.trim()) &&
  Boolean(process.env.SEED_PROFILE_B_ID?.trim());

describe.skipIf(!canRunOnline)("vehicle update/status/archive isolation (4D)", () => {
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

  it("tenant B cannot read or update tenant A vehicle by id", async () => {
    const slug = `4d-iso-${Date.now().toString(36)}`;

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
            make: "Iso",
            model: "Edit",
            year: 2023,
            mileage: 10,
            price: "2000.00",
            currency: "EUR",
            specs: {},
          })
          .returning({ id: vehicles.id, tenantId: vehicles.tenantId });
        const row = rows[0];
        if (!row) throw new Error("insert returned no row");
        return row;
      },
    );

    const readOnB = await withTenantContext(
      db,
      { profileId: profileB, tenantId: tenantBId },
      async (tx) =>
        tx.query.vehicles.findFirst({
          where: and(eq(vehicles.id, created.id), eq(vehicles.tenantId, tenantBId)),
        }),
    );
    expect(readOnB).toBeUndefined();

    const updatedOnB = await withTenantContext(
      db,
      { profileId: profileB, tenantId: tenantBId },
      async (tx) =>
        tx
          .update(vehicles)
          .set({ make: "Hacked", updatedAt: new Date() })
          .where(and(eq(vehicles.id, created.id), eq(vehicles.tenantId, tenantBId)))
          .returning({ id: vehicles.id }),
    );
    expect(updatedOnB).toHaveLength(0);

    const stillA = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx.query.vehicles.findFirst({
          where: and(eq(vehicles.id, created.id), eq(vehicles.tenantId, tenantAId)),
        }),
    );
    expect(stillA?.make).toBe("Iso");
  });

  it("writes audit rows for update, status_change and archive under tenant A only", async () => {
    const slug = `4d-audit-${Date.now().toString(36)}`;

    const vehicleId = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) => {
        const rows = await tx
          .insert(vehicles)
          .values({
            tenantId: tenantAId,
            status: "draft",
            slug,
            make: "Audit",
            model: "Car",
            year: 2022,
            mileage: 5,
            price: "3000.00",
            currency: "EUR",
            specs: {},
          })
          .returning({ id: vehicles.id });
        const row = rows[0];
        if (!row) throw new Error("insert returned no row");

        await writeAuditLog(tx, {
          tenantId: tenantAId,
          actorProfileId: profileA,
          action: "vehicle.create",
          entityType: "vehicle",
          entityId: row.id,
          metadata: { slug },
        });

        await tx
          .update(vehicles)
          .set({ make: "AuditX", updatedAt: new Date() })
          .where(and(eq(vehicles.id, row.id), eq(vehicles.tenantId, tenantAId)));

        await writeAuditLog(tx, {
          tenantId: tenantAId,
          actorProfileId: profileA,
          action: "vehicle.update",
          entityType: "vehicle",
          entityId: row.id,
          metadata: { make: "AuditX" },
        });

        await tx
          .update(vehicles)
          .set({ status: "available", updatedAt: new Date() })
          .where(and(eq(vehicles.id, row.id), eq(vehicles.tenantId, tenantAId)));

        await writeAuditLog(tx, {
          tenantId: tenantAId,
          actorProfileId: profileA,
          action: "vehicle.status_change",
          entityType: "vehicle",
          entityId: row.id,
          metadata: { from: "draft", to: "available" },
        });

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
          metadata: { from: "available", to: "archived" },
        });

        return row.id;
      },
    );

    const logsOnA = await withTenantContext(
      db,
      { profileId: profileA, tenantId: tenantAId },
      async (tx) =>
        tx
          .select({ action: auditLogs.action, tenantId: auditLogs.tenantId })
          .from(auditLogs)
          .where(
            and(eq(auditLogs.tenantId, tenantAId), eq(auditLogs.entityId, vehicleId)),
          ),
    );

    const actions = logsOnA.map((row) => row.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "vehicle.create",
        "vehicle.update",
        "vehicle.status_change",
        "vehicle.archive",
      ]),
    );
    expect(logsOnA.every((row) => row.tenantId === tenantAId)).toBe(true);

    const logsOnB = await withTenantContext(
      db,
      { profileId: profileB, tenantId: tenantBId },
      async (tx) =>
        tx
          .select({ id: auditLogs.id })
          .from(auditLogs)
          .where(and(eq(auditLogs.tenantId, tenantBId), eq(auditLogs.entityId, vehicleId))),
    );
    expect(logsOnB).toHaveLength(0);
  });
});
