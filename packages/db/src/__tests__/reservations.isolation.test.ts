/**
 * Etapa 11A — reservation isolation / concurrency (online).
 * Requires DATABASE_URL + SEED_PROFILE_*_ID.
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { withTenantContext } from "../rls";
import { seedDevTenants } from "../seed/dev-tenants";
import { reservations } from "../schema/reservations";
import { vehicles } from "../schema/vehicles";
import { writeAuditLog } from "../audit";
import { cleanAcmePublicCatalog } from "../demo/clean-acme-public-catalog";

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
  "Etapa 11A reservations isolation (DATABASE_URL + SEED_PROFILE_*_ID)",
  () => {
    let db: Database;
    let tenantAId: string;
    let tenantBId: string;
    let profileA: string;
    let vehicleBId: string;
    /** Dedicated vehicle so parallel cross-tenant tests cannot race on golf-8-acme. */
    let reservationVehicleId: string;

    beforeAll(async () => {
      db = createDb(process.env.DATABASE_URL!);
      const seeded = await seedDevTenants(process.env.DATABASE_URL!);
      tenantAId = seeded.tenantA.id;
      tenantBId = seeded.tenantB.id;
      profileA = seeded.profileA;

      const vb =
        seeded.vehicleB ??
        (await db.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, tenantBId), eq(vehicles.slug, "focus-beta")),
        }));
      if (!vb) throw new Error("Seed vehicle B missing");
      vehicleBId = vb.id;

      reservationVehicleId = await withTenantContext(
        db,
        { profileId: profileA, tenantId: tenantAId },
        async (tx) => {
          const slug = `e11a-res-${randomUUID().slice(0, 8)}`;
          const [created] = await tx
            .insert(vehicles)
            .values({
              tenantId: tenantAId,
              slug,
              make: "Test",
              model: "Reservation",
              year: 2020,
              mileage: 1000,
              price: "10000.00",
              currency: "EUR",
              status: "available",
            })
            .returning({ id: vehicles.id });
          if (!created) throw new Error("Failed to create reservation test vehicle");
          return created.id;
        },
      );
    });

    afterAll(async () => {
      // Do not leave Test Reservation vehicles as public catalog pollution (Etapa 18).
      if (!reservationVehicleId || !db || !profileA || !tenantAId) return;
      await withTenantContext(db, { profileId: profileA, tenantId: tenantAId }, async (tx) => {
        await tx
          .update(reservations)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(
            and(
              eq(reservations.tenantId, tenantAId),
              eq(reservations.vehicleId, reservationVehicleId),
              eq(reservations.status, "active"),
            ),
          );
        await tx
          .update(vehicles)
          .set({ status: "archived", updatedAt: new Date() })
          .where(and(eq(vehicles.id, reservationVehicleId), eq(vehicles.tenantId, tenantAId)));
      });
      // Belt-and-suspenders: archive any leftover ACME public test / Golf rows.
      await cleanAcmePublicCatalog(db);
    });

    async function resetReservationVehicle() {
      await withTenantContext(db, { profileId: profileA, tenantId: tenantAId }, async (tx) => {
        await tx
          .update(reservations)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(
            and(
              eq(reservations.tenantId, tenantAId),
              eq(reservations.vehicleId, reservationVehicleId),
              eq(reservations.status, "active"),
            ),
          );
        await tx
          .update(vehicles)
          .set({ status: "available", updatedAt: new Date() })
          .where(and(eq(vehicles.id, reservationVehicleId), eq(vehicles.tenantId, tenantAId)));
      });
    }
    it("enforces one active reservation per vehicle via partial unique index", async () => {
      await resetReservationVehicle();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const key1 = `e11a-one-active-${randomUUID()}`;
      const key2 = `e11a-one-active-${randomUUID()}`;

      await withTenantContext(db, { profileId: profileA, tenantId: tenantAId }, async (tx) => {
        await tx.insert(reservations).values({
          tenantId: tenantAId,
          vehicleId: reservationVehicleId,
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
            vehicleId: reservationVehicleId,
            status: "active",
            expiresAt,
            createdBy: profileA,
            idempotencyKey: key2,
          }),
        ),
      ).rejects.toThrow();

      await resetReservationVehicle();
    });

    it("idempotency key is unique per tenant (not reusable across tenants by uniqueness alone)", async () => {
      const sharedKey = `e11a-shared-key-${randomUUID()}`;
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await withTenantContext(db, { profileId: profileA, tenantId: tenantAId }, async (tx) => {
        await tx.insert(reservations).values({
          tenantId: tenantAId,
          vehicleId: reservationVehicleId,
          status: "cancelled",
          expiresAt,
          createdBy: profileA,
          idempotencyKey: sharedKey,
        });
      });

      // Same key on tenant B is allowed by DB unique (tenant, key).
      const profileB = process.env.SEED_PROFILE_B_ID!.trim();
      await withTenantContext(db, { profileId: profileB, tenantId: tenantBId }, async (tx) => {
        await tx.insert(reservations).values({
          tenantId: tenantBId,
          vehicleId: vehicleBId,
          status: "cancelled",
          expiresAt,
          createdBy: profileB,
          idempotencyKey: sharedKey,
        });
      });

      const a = await db.query.reservations.findFirst({
        where: and(
          eq(reservations.tenantId, tenantAId),
          eq(reservations.idempotencyKey, sharedKey),
        ),
      });
      const b = await db.query.reservations.findFirst({
        where: and(
          eq(reservations.tenantId, tenantBId),
          eq(reservations.idempotencyKey, sharedKey),
        ),
      });
      expect(a?.tenantId).toBe(tenantAId);
      expect(b?.tenantId).toBe(tenantBId);
      expect(a?.id).not.toBe(b?.id);
    });

    it("conditional available→reserved update is atomic (second claim fails)", async () => {
      await resetReservationVehicle();
      await withTenantContext(db, { profileId: profileA, tenantId: tenantAId }, async (tx) => {
        const first = await tx
          .update(vehicles)
          .set({ status: "reserved", updatedAt: new Date() })
          .where(
            and(
              eq(vehicles.id, reservationVehicleId),
              eq(vehicles.tenantId, tenantAId),
              eq(vehicles.status, "available"),
            ),
          )
          .returning({ id: vehicles.id });
        expect(first[0]?.id).toBe(reservationVehicleId);

        const second = await tx
          .update(vehicles)
          .set({ status: "reserved", updatedAt: new Date() })
          .where(
            and(
              eq(vehicles.id, reservationVehicleId),
              eq(vehicles.tenantId, tenantAId),
              eq(vehicles.status, "available"),
            ),
          )
          .returning({ id: vehicles.id });
        expect(second).toHaveLength(0);
      });
      await resetReservationVehicle();
    });

    it("lazy expiry marks active past-due as expired and frees reserved vehicle", async () => {
      await resetReservationVehicle();
      const key = `e11a-expire-${randomUUID()}`;
      const past = new Date(Date.now() - 60_000);

      await withTenantContext(db, { profileId: profileA, tenantId: tenantAId }, async (tx) => {
        await tx
          .update(vehicles)
          .set({ status: "reserved", updatedAt: new Date() })
          .where(eq(vehicles.id, reservationVehicleId));

        const [row] = await tx
          .insert(reservations)
          .values({
            tenantId: tenantAId,
            vehicleId: reservationVehicleId,
            status: "active",
            expiresAt: past,
            createdBy: profileA,
            idempotencyKey: key,
          })
          .returning({ id: reservations.id });

        const expired = await tx
          .update(reservations)
          .set({ status: "expired", updatedAt: new Date() })
          .where(
            and(
              eq(reservations.id, row!.id),
              eq(reservations.status, "active"),
            ),
          )
          .returning({ id: reservations.id });
        expect(expired).toHaveLength(1);

        await tx
          .update(vehicles)
          .set({ status: "available", updatedAt: new Date() })
          .where(
            and(eq(vehicles.id, reservationVehicleId), eq(vehicles.status, "reserved")),
          );

        await writeAuditLog(tx, {
          tenantId: tenantAId,
          actorProfileId: profileA,
          action: "reservation.expired",
          entityType: "reservation",
          entityId: row!.id,
          metadata: {
            vehicleId: reservationVehicleId,
            fromStatus: "active",
            toStatus: "expired",
          },
        });

        const vehicle = await tx.query.vehicles.findFirst({
          where: eq(vehicles.id, reservationVehicleId),
        });
        expect(vehicle?.status).toBe("available");
      });
    });

    it("does not release sold vehicles on expiry-style update", async () => {
      await resetReservationVehicle();
      await withTenantContext(db, { profileId: profileA, tenantId: tenantAId }, async (tx) => {
        await tx
          .update(vehicles)
          .set({ status: "sold", updatedAt: new Date() })
          .where(eq(vehicles.id, reservationVehicleId));

        const released = await tx
          .update(vehicles)
          .set({ status: "available", updatedAt: new Date() })
          .where(
            and(
              eq(vehicles.id, reservationVehicleId),
              eq(vehicles.tenantId, tenantAId),
              eq(vehicles.status, "reserved"),
            ),
          )
          .returning({ id: vehicles.id });
        expect(released).toHaveLength(0);

        const vehicle = await tx.query.vehicles.findFirst({
          where: eq(vehicles.id, reservationVehicleId),
        });
        expect(vehicle?.status).toBe("sold");
      });
      await resetReservationVehicle();
    });
  },
);

describe("Etapa 11A reservations online gate", () => {
  it("documents skip when DATABASE_URL or seed profiles are absent", () => {
    if (!canRunOnline) {
      expect(hasDatabaseUrl && hasSeedProfiles).toBe(false);
    } else {
      expect(canRunOnline).toBe(true);
    }
  });
});
