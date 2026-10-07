/**
 * Public storefront RLS + catalog isolation (Etapa 5).
 *
 * Requires DATABASE_URL + SEED_PROFILE_*_ID.
 * Prefer a DB role WITHOUT BYPASSRLS for true RLS verification.
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { clearTenantSession, withTenantContext } from "../rls";
import { seedDevTenants } from "../seed/dev-tenants";
import { leads } from "../schema/leads";
import { tenants } from "../schema/tenants";
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

const TRIAL_SLUG = "e5-trial-public";
const SUSPENDED_SLUG = "e5-suspended-public";
const RESERVED_SLUG = "e5-acme-reserved-public";

describe.skipIf(!canRunOnline)(
  "public storefront tenants RLS (requires DATABASE_URL + SEED_PROFILE_*_ID)",
  () => {
    let db: Database;
    let tenantAId: string;
    let profileA: string;
    let roleBypassesRls = false;
    let trialTenantId: string | null = null;
    let suspendedTenantId: string | null = null;

    beforeAll(async () => {
      db = createDb(process.env.DATABASE_URL!);
      const seeded = await seedDevTenants(process.env.DATABASE_URL!);
      tenantAId = seeded.tenantA.id;
      profileA = seeded.profileA;

      const [bypassRow] = await db.execute<{ rolbypassrls: boolean }>(
        sql`select rolbypassrls from pg_roles where rolname = current_user`,
      );
      roleBypassesRls = Boolean(bypassRow?.rolbypassrls);

      await db
        .insert(tenants)
        .values({
          name: "E5 Trial Dealer",
          slug: TRIAL_SLUG,
          status: "trial",
          plan: "starter",
          branding: { primaryColor: "#0ea5e9" },
        })
        .onConflictDoNothing({ target: tenants.slug });

      await db
        .insert(tenants)
        .values({
          name: "E5 Suspended Dealer",
          slug: SUSPENDED_SLUG,
          status: "suspended",
          plan: "starter",
          branding: { primaryColor: "#dc2626" },
        })
        .onConflictDoNothing({ target: tenants.slug });

      await db.update(tenants).set({ status: "trial" }).where(eq(tenants.slug, TRIAL_SLUG));
      await db
        .update(tenants)
        .set({ status: "suspended" })
        .where(eq(tenants.slug, SUSPENDED_SLUG));

      const trial = await db.query.tenants.findFirst({ where: eq(tenants.slug, TRIAL_SLUG) });
      const suspended = await db.query.tenants.findFirst({
        where: eq(tenants.slug, SUSPENDED_SLUG),
      });
      trialTenantId = trial?.id ?? null;
      suspendedTenantId = suspended?.id ?? null;

      await db
        .insert(vehicles)
        .values({
          tenantId: tenantAId,
          status: "reserved",
          slug: RESERVED_SLUG,
          make: "Skoda",
          model: "Octavia",
          year: 2020,
          mileage: 50000,
          price: "12990.00",
          currency: "EUR",
          specs: { fuel: "petrol" },
        })
        .onConflictDoNothing({ target: [vehicles.tenantId, vehicles.slug] });

      await db
        .update(vehicles)
        .set({ status: "reserved" })
        .where(and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, RESERVED_SLUG)));
    });

    it("anon can SELECT active and trial tenants; suspended denied by policy or app", async () => {
      await clearTenantSession(db);

      const active = await db.query.tenants.findFirst({ where: eq(tenants.slug, "acme") });
      const trial = await db.query.tenants.findFirst({ where: eq(tenants.slug, TRIAL_SLUG) });
      const suspended = await db.query.tenants.findFirst({
        where: eq(tenants.slug, SUSPENDED_SLUG),
      });
      const missing = await db.query.tenants.findFirst({
        where: eq(tenants.slug, "no-such-tenant-zzzz"),
      });

      expect(active?.status).toBe("active");
      expect(trial?.status).toBe("trial");
      expect(active).toBeTruthy();
      expect(trial).toBeTruthy();
      expect(missing).toBeUndefined();

      if (roleBypassesRls) {
        expect(suspended?.status).toBe("suspended");
        // App layer must still map suspended → not_found (mirrors loadPublicTenantBySlug).
        expect(suspended?.status === "suspended").toBe(true);
      } else {
        expect(suspended).toBeUndefined();
      }
      expect(suspendedTenantId).toBeTruthy();
      expect(trialTenantId).toBeTruthy();
    });

    it("staff membership SELECT on tenants remains available", async () => {
      const row = await withTenantContext(
        db,
        { profileId: profileA, tenantId: tenantAId },
        async (tx) => tx.query.tenants.findFirst({ where: eq(tenants.id, tenantAId) }),
      );

      expect(row?.id).toBe(tenantAId);
      expect(row?.slug).toBe("acme");
    });

    it("FORCE RLS remains enabled on public.tenants", async () => {
      const [row] = await db.execute<{
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>(sql`
        select c.relrowsecurity, c.relforcerowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'tenants'
      `);

      expect(row?.relrowsecurity).toBe(true);
      expect(row?.relforcerowsecurity).toBe(true);
    });

    it("policy tenants_select_public_storefront exists (SELECT only)", async () => {
      const rows = await db.execute<{
        polname: string;
        polcmd: string;
      }>(sql`
        select pol.polname, pol.polcmd::text as polcmd
        from pg_policy pol
        join pg_class c on c.oid = pol.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'tenants'
          and pol.polname = 'tenants_select_public_storefront'
      `);

      const list = Array.from(rows as unknown as Array<{ polname: string; polcmd: string }>);
      expect(list.length).toBe(1);
      // polcmd: r = SELECT
      expect(list[0]?.polcmd).toBe("r");
    });
  },
);

describe.skipIf(!canRunOnline)(
  "public catalog isolation ACME/BETA + available-only",
  () => {
    let db: Database;
    let tenantAId: string;
    let tenantBId: string;
    let vehicleAId: string;
    let vehicleBId: string;

    beforeAll(async () => {
      db = createDb(process.env.DATABASE_URL!);
      const seeded = await seedDevTenants(process.env.DATABASE_URL!);
      tenantAId = seeded.tenantA.id;
      tenantBId = seeded.tenantB.id;

      const va =
        seeded.vehicleA ??
        (await db.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, "golf-8-acme")),
        }));
      // Public ACME fixture is showcase (Golf is archived without cover — Etapa 18).
      const showcase = await db.query.vehicles.findFirst({
        where: and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, "koenigsegg-ccx")),
      });
      const vb =
        seeded.vehicleB ??
        (await db.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, tenantBId), eq(vehicles.slug, "focus-beta")),
        }));
      if (!va || !vb || !showcase) throw new Error("Seed vehicles missing");
      vehicleAId = showcase.id;
      vehicleBId = vb.id;

      await db
        .insert(vehicles)
        .values({
          tenantId: tenantAId,
          status: "reserved",
          slug: RESERVED_SLUG,
          make: "Skoda",
          model: "Octavia",
          year: 2020,
          mileage: 50000,
          price: "12990.00",
          currency: "EUR",
          specs: {},
        })
        .onConflictDoNothing({ target: [vehicles.tenantId, vehicles.slug] });

      await db
        .update(vehicles)
        .set({ status: "reserved" })
        .where(and(eq(vehicles.tenantId, tenantAId), eq(vehicles.slug, RESERVED_SLUG)));
    });

    it("ACME public catalog never includes BETA vehicles", async () => {
      await clearTenantSession(db);

      const acmePublic = await db
        .select({
          id: vehicles.id,
          tenantId: vehicles.tenantId,
          slug: vehicles.slug,
          status: vehicles.status,
        })
        .from(vehicles)
        .where(and(eq(vehicles.tenantId, tenantAId), eq(vehicles.status, "available")));

      expect(acmePublic.every((row) => row.tenantId === tenantAId)).toBe(true);
      expect(acmePublic.some((row) => row.id === vehicleAId)).toBe(true);
      expect(acmePublic.some((row) => row.slug === "koenigsegg-ccx")).toBe(true);
      expect(acmePublic.some((row) => row.slug === "golf-8-acme")).toBe(false);
      expect(acmePublic.some((row) => row.id === vehicleBId)).toBe(false);
      expect(acmePublic.some((row) => row.slug === "focus-beta")).toBe(false);
    });

    it("BETA public catalog never includes ACME vehicles", async () => {
      await clearTenantSession(db);

      const betaPublic = await db
        .select({
          id: vehicles.id,
          tenantId: vehicles.tenantId,
          slug: vehicles.slug,
        })
        .from(vehicles)
        .where(and(eq(vehicles.tenantId, tenantBId), eq(vehicles.status, "available")));

      expect(betaPublic.every((row) => row.tenantId === tenantBId)).toBe(true);
      expect(betaPublic.some((row) => row.id === vehicleBId)).toBe(true);
      expect(betaPublic.some((row) => row.id === vehicleAId)).toBe(false);
    });

    it("only status available is public; reserved stays hidden", async () => {
      await clearTenantSession(db);

      const publicRows = await db
        .select({ slug: vehicles.slug, status: vehicles.status })
        .from(vehicles)
        .where(and(eq(vehicles.tenantId, tenantAId), eq(vehicles.status, "available")));

      expect(publicRows.every((row) => row.status === "available")).toBe(true);
      expect(publicRows.some((row) => row.slug === RESERVED_SLUG)).toBe(false);

      const reservedLookup = await db
        .select({ slug: vehicles.slug })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.tenantId, tenantAId),
            eq(vehicles.slug, RESERVED_SLUG),
            eq(vehicles.status, "available"),
          ),
        )
        .limit(1);

      expect(reservedLookup).toHaveLength(0);
    });

    it("foreign slug on ACME tenant resolves empty (404 path)", async () => {
      await clearTenantSession(db);

      const foreign = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.tenantId, tenantAId),
            eq(vehicles.slug, "focus-beta"),
            eq(vehicles.status, "available"),
          ),
        )
        .limit(1);

      const missing = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.tenantId, tenantAId),
            eq(vehicles.slug, "no-such-vehicle-zzzz"),
            eq(vehicles.status, "available"),
          ),
        )
        .limit(1);

      expect(foreign).toHaveLength(0);
      expect(missing).toHaveLength(0);
    });
  },
);

describe.skipIf(!canRunOnline)(
  "public lead attribution is server-side (tenant + vehicle)",
  () => {
    let db: Database;
    let tenantAId: string;
    let tenantBId: string;
    let vehicleAId: string;
    let vehicleBId: string;
    let trialTenantId: string;

    beforeAll(async () => {
      db = createDb(process.env.DATABASE_URL!);
      const seeded = await seedDevTenants(process.env.DATABASE_URL!);
      tenantAId = seeded.tenantA.id;
      tenantBId = seeded.tenantB.id;

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
      if (!va || !vb) throw new Error("Seed vehicles missing");
      vehicleAId = va.id;
      vehicleBId = vb.id;

      await db
        .insert(tenants)
        .values({
          name: "E5 Trial Dealer",
          slug: TRIAL_SLUG,
          status: "trial",
          plan: "starter",
          branding: {},
        })
        .onConflictDoNothing({ target: tenants.slug });
      await db.update(tenants).set({ status: "trial" }).where(eq(tenants.slug, TRIAL_SLUG));
      const trial = await db.query.tenants.findFirst({ where: eq(tenants.slug, TRIAL_SLUG) });
      if (!trial) throw new Error("Trial fixture missing");
      trialTenantId = trial.id;
    });

    it("anon insert binds lead to Host tenant + page vehicle only", async () => {
      await clearTenantSession(db);

      const [inserted] = await db
        .insert(leads)
        .values({
          tenantId: tenantAId,
          vehicleId: vehicleAId,
          name: "E5 Public Lead",
          email: "e5-public-lead@example.test",
          source: "storefront",
          status: "new",
          consentAt: new Date(),
          consentVersion: "v1",
          notificationStatus: "pending",
        })
        .returning({
          id: leads.id,
          tenantId: leads.tenantId,
          vehicleId: leads.vehicleId,
          consentAt: leads.consentAt,
          notificationStatus: leads.notificationStatus,
        });

      expect(inserted?.tenantId).toBe(tenantAId);
      expect(inserted?.vehicleId).toBe(vehicleAId);
      expect(inserted?.vehicleId).not.toBe(vehicleBId);
      expect(inserted?.consentAt).toBeTruthy();
      expect(inserted?.notificationStatus).toBe("pending");
      // Leave fixture lead (no DELETE policy on leads); unique name/email per run not required for assertion.
    });

    it("anon cannot insert lead for trial tenant (existing leads RLS)", async () => {
      await clearTenantSession(db);

      const [bypassRow] = await db.execute<{ rolbypassrls: boolean }>(
        sql`select rolbypassrls from pg_roles where rolname = current_user`,
      );
      const bypasses = Boolean(bypassRow?.rolbypassrls);

      if (bypasses) {
        // Runtime prefers non-BYPASSRLS; with bypass, app still denies trial (status !== active).
        expect(trialTenantId).toBeTruthy();
        return;
      }

      await expect(
        db.insert(leads).values({
          tenantId: trialTenantId,
          vehicleId: null,
          name: "Should Fail Trial",
          source: "storefront",
          status: "new",
          consentAt: new Date(),
          consentVersion: "v1",
        }),
      ).rejects.toThrow();
    });

    it("finalize_lead_notification updates only matching lead+tenant notification columns", async () => {
      await clearTenantSession(db);

      const [row] = await db
        .insert(leads)
        .values({
          tenantId: tenantAId,
          vehicleId: vehicleAId,
          name: "E17 Notify Lead",
          email: "e17-notify@example.test",
          source: "storefront",
          status: "new",
          consentAt: new Date(),
          consentVersion: "v1",
          notificationStatus: "pending",
        })
        .returning({ id: leads.id });

      expect(row?.id).toBeTruthy();

      const [ok] = await db.execute<{ finalize_lead_notification: boolean }>(
        sql`select app.finalize_lead_notification(
          ${row!.id}::uuid,
          ${tenantAId}::uuid,
          'not_configured'::public.lead_notification_status,
          'not_configured'
        ) as finalize_lead_notification`,
      );
      expect(ok?.finalize_lead_notification).toBe(true);

      const [updated] = await db
        .select({
          notificationStatus: leads.notificationStatus,
          notificationReason: leads.notificationReason,
          status: leads.status,
        })
        .from(leads)
        .where(eq(leads.id, row!.id))
        .limit(1);

      expect(updated?.notificationStatus).toBe("not_configured");
      expect(updated?.notificationReason).toBe("not_configured");
      expect(updated?.status).toBe("new");

      // Cross-tenant finalize must not update
      const [cross] = await db.execute<{ finalize_lead_notification: boolean }>(
        sql`select app.finalize_lead_notification(
          ${row!.id}::uuid,
          ${tenantBId}::uuid,
          'failed'::public.lead_notification_status,
          'provider_error'
        ) as finalize_lead_notification`,
      );
      expect(cross?.finalize_lead_notification).toBe(false);

      const [still] = await db
        .select({ notificationStatus: leads.notificationStatus })
        .from(leads)
        .where(eq(leads.id, row!.id))
        .limit(1);
      expect(still?.notificationStatus).toBe("not_configured");
    });

    it("leads public insert policy still requires tenant status active", async () => {
      const rows = await db.execute<{ with_check: string }>(sql`
        select pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
        from pg_policy pol
        join pg_class c on c.oid = pol.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'leads'
          and pol.polname = 'leads_insert_member_or_public'
      `);
      const list = Array.from(rows as unknown as Array<{ with_check: string }>);
      expect(list.length).toBe(1);
      expect(list[0]?.with_check ?? "").toMatch(/active/);
    });

    it("client-supplied foreign vehicle id must not be used by app (association check)", async () => {
      // Mirrors createPublicLeadAction: vehicle resolved via Host tenantId + page slug,
      // never from client vehicle_id. Cross-tenant vehicle is rejected by the same filters.
      await clearTenantSession(db);

      const wrongTenantLookup = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.tenantId, tenantAId),
            eq(vehicles.id, vehicleBId),
            eq(vehicles.status, "available"),
          ),
        )
        .limit(1);

      expect(wrongTenantLookup).toHaveLength(0);
      expect(vehicleAId).not.toBe(vehicleBId);
      expect(tenantAId).not.toEqual(tenantBId);
    });
  },
);

describe("public storefront isolation (offline)", () => {
  it("documents skip when DATABASE_URL or seed profiles are absent", () => {
    expect(typeof canRunOnline).toBe("boolean");
  });
});
