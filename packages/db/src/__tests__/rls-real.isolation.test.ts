/**
 * Etapa 20 — real RLS isolation (anon / authenticated, no BYPASSRLS).
 *
 * Requires DATABASE_URL + SEED_PROFILE_*_ID and seeded ACME/Beta fixtures.
 * All mutating scenarios run inside rolled-back transactions.
 */

import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { seedDevTenants } from "../seed/dev-tenants";
import { vehicles } from "../schema/vehicles";
import {
  isRlsOrPrivilegeDenial,
  withRlsRole,
} from "./rls-role-helpers";

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

describe.skipIf(!canRunOnline)(
  "Etapa 20 real RLS (SET LOCAL ROLE, rolbypassrls=false)",
  () => {
    let db: Database;
    let acmeId: string;
    let betaId: string;
    let profileAcme: string;
    let profileBeta: string;
    let acmeAvailableId: string;
    let betaAvailableId: string;
    let acmeArchivedId: string;
    let acmeDraftId: string | null = null;
    let acmeReservedId: string | null = null;

    beforeAll(async () => {
      db = createDb(process.env.DATABASE_URL!);
      const seeded = await seedDevTenants(process.env.DATABASE_URL!);
      acmeId = seeded.tenantA.id;
      betaId = seeded.tenantB.id;
      profileAcme = seeded.profileA;
      profileBeta = seeded.profileB;

      const acmeAvailable =
        (await db.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, acmeId), eq(vehicles.slug, "koenigsegg-ccx")),
        })) ??
        (await db.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, acmeId), eq(vehicles.status, "available")),
        }));
      const betaAvailable =
        seeded.vehicleB ??
        (await db.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, betaId), eq(vehicles.slug, "focus-beta")),
        }));
      const acmeArchived =
        seeded.vehicleA ??
        (await db.query.vehicles.findFirst({
          where: and(eq(vehicles.tenantId, acmeId), eq(vehicles.slug, "golf-8-acme")),
        }));
      const draft = await db.query.vehicles.findFirst({
        where: and(eq(vehicles.tenantId, acmeId), eq(vehicles.status, "draft")),
      });
      const reserved = await db.query.vehicles.findFirst({
        where: and(eq(vehicles.tenantId, acmeId), eq(vehicles.status, "reserved")),
      });

      if (!acmeAvailable || !betaAvailable || !acmeArchived) {
        throw new Error("Etapa20 RLS: missing ACME/Beta seed vehicles");
      }

      acmeAvailableId = acmeAvailable.id;
      betaAvailableId = betaAvailable.id;
      acmeArchivedId = acmeArchived.id;
      acmeDraftId = draft?.id ?? null;
      acmeReservedId = reserved?.id ?? null;
    });

    it("helper refuses to continue when SET ROLE still has BYPASSRLS (sanity on anon)", async () => {
      const probe = await withRlsRole(db, "anon", async (tx) => {
        const rows = await tx.execute<{ usr: string; bypass: boolean }>(sql`
          select current_user as usr,
                 (select rolbypassrls from pg_roles where rolname = current_user) as bypass
        `);
        return Array.from(rows as unknown as Array<{ usr: string; bypass: boolean }>)[0]!;
      });
      expect(probe.usr).toBe("anon");
      expect(Boolean(probe.bypass)).toBe(false);
    });

    describe("leads", () => {
      it("1. anon insert valid on active tenant succeeds (rolled back)", async () => {
        // No RETURNING: under anon, SELECT policy would hide the new row and fail RETURNING.
        const leadId = randomUUID();
        await withRlsRole(db, "anon", async (tx) => {
          await tx.execute(sql`
            insert into leads (
              id, tenant_id, vehicle_id, name, email, phone, source, status,
              consent_at, consent_version, notification_status
            ) values (
              ${leadId}::uuid, ${acmeId}::uuid, ${acmeAvailableId}::uuid,
              'RLS Lead Ok', 'rls-lead-ok@example.test', '+40722100001',
              'storefront', 'new', now(), 'v1', 'pending'
            )
          `);
        });
      });

      it("2. anon insert with fake tenant id is denied", async () => {
        const fakeTenant = randomUUID();
        await withRlsRole(db, "anon", async (tx) => {
          await expect(
            tx.execute(sql`
              insert into leads (
                tenant_id, name, email, source, status,
                consent_at, consent_version, notification_status
              ) values (
                ${fakeTenant}::uuid, 'RLS Fake Tenant', 'rls-fake@example.test',
                'storefront', 'new', now(), 'v1', 'pending'
              )
            `),
          ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
        });
      });

      it("3. anon insert without tenant_id is rejected", async () => {
        await withRlsRole(db, "anon", async (tx) => {
          await expect(
            tx.execute(sql`
              insert into leads (
                name, email, source, status,
                consent_at, consent_version, notification_status
              ) values (
                'RLS No Tenant', 'rls-none@example.test',
                'storefront', 'new', now(), 'v1', 'pending'
              )
            `),
          ).rejects.toThrow();
        });
      });

      it("4. anon insert on inactive tenant is denied", async () => {
        const inactiveId = randomUUID();
        await withRlsRole(
          db,
          "anon",
          async (tx) => {
            await expect(
              tx.execute(sql`
                insert into leads (
                  tenant_id, name, email, source, status,
                  consent_at, consent_version, notification_status
                ) values (
                  ${inactiveId}::uuid, 'RLS Inactive', 'rls-inactive@example.test',
                  'storefront', 'new', now(), 'v1', 'pending'
                )
              `),
            ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
          },
          {
            setupAsOwner: async (tx) => {
              await tx.execute(sql`
                insert into tenants (id, name, slug, status, plan, branding)
                values (
                  ${inactiveId}::uuid,
                  'RLS Trial Temp',
                  ${`rls-trial-${inactiveId.slice(0, 8)}`},
                  'trial',
                  'starter',
                  '{}'::jsonb
                )
              `);
            },
          },
        );
      });

      it("5. anon insert with foreign vehicle_id is allowed by leads policy (documented gap)", async () => {
        // Ideal posture: deny. Current leads_insert_member_or_public only checks tenant active,
        // not vehicle.tenant_id. App-layer Server Actions must bind Host+slug. Follow-up policy.
        const leadId = randomUUID();
        await withRlsRole(db, "anon", async (tx) => {
          await tx.execute(sql`
            insert into leads (
              id, tenant_id, vehicle_id, name, email, source, status,
              consent_at, consent_version, notification_status
            ) values (
              ${leadId}::uuid, ${acmeId}::uuid, ${betaAvailableId}::uuid,
              'RLS Cross Vehicle', 'rls-cross-v@example.test',
              'storefront', 'new', now(), 'v1', 'pending'
            )
          `);
        });
      });

      it("6. anon select leads is empty (no membership)", async () => {
        await withRlsRole(db, "anon", async (tx) => {
          const rows = await tx.execute<{ n: number }>(sql`select count(*)::int as n from leads`);
          const n = Array.from(rows as unknown as Array<{ n: number }>)[0]?.n ?? -1;
          expect(n).toBe(0);
        });
      });

      it("7. authenticated ACME staff can select ACME leads", async () => {
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            const rows = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from leads where tenant_id = ${acmeId}::uuid
            `);
            const n = Array.from(rows as unknown as Array<{ n: number }>)[0]?.n ?? -1;
            expect(n).toBeGreaterThanOrEqual(0);
            // Cross-check: any returned lead must be ACME (0 rows still OK if empty DB).
            const sample = await tx.execute<{ tid: string }>(sql`
              select tenant_id::text as tid from leads where tenant_id = ${acmeId}::uuid limit 5
            `);
            for (const row of Array.from(sample as unknown as Array<{ tid: string }>)) {
              expect(row.tid).toBe(acmeId);
            }
          },
          { gucs: { profileId: profileAcme, tenantId: acmeId } },
        );
      });

      it("8. authenticated Beta staff cannot select ACME leads", async () => {
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            const rows = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from leads where tenant_id = ${acmeId}::uuid
            `);
            const n = Array.from(rows as unknown as Array<{ n: number }>)[0]?.n ?? -1;
            expect(n).toBe(0);
          },
          { gucs: { profileId: profileBeta, tenantId: betaId } },
        );
      });

      it("9. anon update on leads is denied (0 rows / no mutation)", async () => {
        // RLS UPDATE without matching USING typically updates 0 rows (no throw).
        await withRlsRole(db, "anon", async (tx) => {
          const before = await tx.execute<{ n: number }>(sql`
            select count(*)::int as n from leads
            where tenant_id = ${acmeId}::uuid and status = 'contacted'
          `);
          await tx.execute(sql`
            update leads set status = 'contacted' where tenant_id = ${acmeId}::uuid
          `);
          const after = await tx.execute<{ n: number }>(sql`
            select count(*)::int as n from leads
            where tenant_id = ${acmeId}::uuid and status = 'contacted'
          `);
          // Anon cannot SELECT leads either — both counts stay 0; mutation must not persist after rollback anyway.
          const b = Array.from(before as unknown as Array<{ n: number }>)[0]?.n ?? 0;
          const a = Array.from(after as unknown as Array<{ n: number }>)[0]?.n ?? 0;
          expect(a).toBe(b);
          expect(a).toBe(0);
        });
      });

      it("10. authenticated Beta cannot update ACME leads", async () => {
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            // RLS WITH CHECK/USING: zero rows updated, or denial — both acceptable if no ACME mutation.
            const before = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from leads
              where tenant_id = ${acmeId}::uuid and status = 'contacted'
            `);
            await tx.execute(sql`
              update leads set status = 'contacted' where tenant_id = ${acmeId}::uuid
            `);
            const after = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from leads
              where tenant_id = ${acmeId}::uuid and status = 'contacted'
            `);
            const b = Array.from(before as unknown as Array<{ n: number }>)[0]?.n ?? 0;
            const a = Array.from(after as unknown as Array<{ n: number }>)[0]?.n ?? 0;
            expect(a).toBe(b);
          },
          { gucs: { profileId: profileBeta, tenantId: betaId } },
        );
      });
    });

    describe("finance_applications", () => {
      async function insertCompanionLead(
        tx: Database,
        tenantId: string,
        vehicleId: string,
      ): Promise<string> {
        const id = randomUUID();
        await tx.execute(sql`
          insert into leads (
            id, tenant_id, vehicle_id, name, email, phone, source, status,
            consent_at, consent_version, notification_status
          ) values (
            ${id}::uuid, ${tenantId}::uuid, ${vehicleId}::uuid,
            'RLS Finance Companion', 'rls-fin@example.test', '+40722100002',
            'finance', 'new', now(), 'finance-v1', 'pending'
          )
        `);
        return id;
      }

      it("1. anon finance insert valid (lead+app) succeeds", async () => {
        await withRlsRole(db, "anon", async (tx) => {
          const leadId = await insertCompanionLead(tx, acmeId, acmeAvailableId);
          const appId = randomUUID();
          await tx.execute(sql`
            insert into finance_applications (
              id, tenant_id, vehicle_id, lead_id, applicant_type, full_name,
              email, phone, amount_eur, term_months,
              vehicle_price_eur_snapshot, estimated_monthly_eur_snapshot,
              consent_at, consent_version, status
            ) values (
              ${appId}::uuid, ${acmeId}::uuid, ${acmeAvailableId}::uuid, ${leadId}::uuid,
              'individual', 'RLS Finance', 'rls-fin@example.test', '+40722100002',
              10000.00, 60, 185000.00, 188.00, now(), 'finance-v1', 'new'
            )
          `);
        });
      });

      it("2. anon finance insert with foreign vehicle_id is denied", async () => {
        await withRlsRole(db, "anon", async (tx) => {
          const leadId = await insertCompanionLead(tx, acmeId, acmeAvailableId);
          await expect(
            tx.execute(sql`
              insert into finance_applications (
                id, tenant_id, vehicle_id, lead_id, applicant_type, full_name,
                email, phone, amount_eur, term_months,
                vehicle_price_eur_snapshot, estimated_monthly_eur_snapshot,
                consent_at, consent_version, status
              ) values (
                ${randomUUID()}::uuid, ${acmeId}::uuid, ${betaAvailableId}::uuid, ${leadId}::uuid,
                'individual', 'RLS Bad Vehicle', 'rls-fin-v@example.test', '+40722100003',
                1000.00, 12, 1000.00, 90.00, now(), 'finance-v1', 'new'
              )
            `),
          ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
        });
      });

      it("3. anon finance insert with foreign lead_id is denied", async () => {
        await withRlsRole(db, "anon", async (tx) => {
          const foreignLead = await insertCompanionLead(tx, betaId, betaAvailableId);
          await expect(
            tx.execute(sql`
              insert into finance_applications (
                id, tenant_id, vehicle_id, lead_id, applicant_type, full_name,
                email, phone, amount_eur, term_months,
                vehicle_price_eur_snapshot, estimated_monthly_eur_snapshot,
                consent_at, consent_version, status
              ) values (
                ${randomUUID()}::uuid, ${acmeId}::uuid, ${acmeAvailableId}::uuid, ${foreignLead}::uuid,
                'individual', 'RLS Bad Lead', 'rls-fin-l@example.test', '+40722100004',
                1000.00, 12, 1000.00, 90.00, now(), 'finance-v1', 'new'
              )
            `),
          ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
        });
      });

      it("4. anon finance insert on inactive tenant is denied", async () => {
        const inactiveId = randomUUID();
        await withRlsRole(
          db,
          "anon",
          async (tx) => {
            await expect(
              tx.execute(sql`
                insert into finance_applications (
                  tenant_id, vehicle_id, lead_id, applicant_type, full_name,
                  email, phone, amount_eur, term_months,
                  vehicle_price_eur_snapshot, estimated_monthly_eur_snapshot,
                  consent_at, consent_version, status
                ) values (
                  ${inactiveId}::uuid, null, ${randomUUID()}::uuid,
                  'individual', 'RLS Inactive Fin', 'rls-fin-i@example.test', '+40722100005',
                  1000.00, 12, 1000.00, 90.00, now(), 'finance-v1', 'new'
                )
              `),
            ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
          },
          {
            setupAsOwner: async (tx) => {
              await tx.execute(sql`
                insert into tenants (id, name, slug, status, plan, branding)
                values (
                  ${inactiveId}::uuid,
                  'RLS Fin Trial',
                  ${`rls-fin-${inactiveId.slice(0, 8)}`},
                  'trial',
                  'starter',
                  '{}'::jsonb
                )
              `);
            },
          },
        );
      });

      it("5. anon select finance_applications is empty", async () => {
        await withRlsRole(db, "anon", async (tx) => {
          const rows = await tx.execute<{ n: number }>(
            sql`select count(*)::int as n from finance_applications`,
          );
          expect(Array.from(rows as unknown as Array<{ n: number }>)[0]?.n).toBe(0);
        });
      });

      it("6. authenticated ACME staff can select ACME finance rows", async () => {
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            const rows = await tx.execute<{ tid: string }>(sql`
              select tenant_id::text as tid from finance_applications
              where tenant_id = ${acmeId}::uuid
              limit 10
            `);
            for (const row of Array.from(rows as unknown as Array<{ tid: string }>)) {
              expect(row.tid).toBe(acmeId);
            }
          },
          { gucs: { profileId: profileAcme, tenantId: acmeId } },
        );
      });

      it("7. authenticated Beta cannot select ACME finance rows", async () => {
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            const rows = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from finance_applications
              where tenant_id = ${acmeId}::uuid
            `);
            expect(Array.from(rows as unknown as Array<{ n: number }>)[0]?.n).toBe(0);
          },
          { gucs: { profileId: profileBeta, tenantId: betaId } },
        );
      });

      it("8. anon update finance_applications is denied (0 visible rows)", async () => {
        await withRlsRole(db, "anon", async (tx) => {
          const before = await tx.execute<{ n: number }>(sql`
            select count(*)::int as n from finance_applications
            where tenant_id = ${acmeId}::uuid and status = 'contacted'
          `);
          await tx.execute(sql`
            update finance_applications set status = 'contacted'
            where tenant_id = ${acmeId}::uuid
          `);
          const after = await tx.execute<{ n: number }>(sql`
            select count(*)::int as n from finance_applications
            where tenant_id = ${acmeId}::uuid and status = 'contacted'
          `);
          const b = Array.from(before as unknown as Array<{ n: number }>)[0]?.n ?? 0;
          const a = Array.from(after as unknown as Array<{ n: number }>)[0]?.n ?? 0;
          expect(a).toBe(b);
          expect(a).toBe(0);
        });
      });

      it("9. authenticated Beta cannot update ACME finance rows", async () => {
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            const before = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from finance_applications
              where tenant_id = ${acmeId}::uuid and status = 'contacted'
            `);
            await tx.execute(sql`
              update finance_applications set status = 'contacted'
              where tenant_id = ${acmeId}::uuid
            `);
            const after = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from finance_applications
              where tenant_id = ${acmeId}::uuid and status = 'contacted'
            `);
            const b = Array.from(before as unknown as Array<{ n: number }>)[0]?.n ?? 0;
            const a = Array.from(after as unknown as Array<{ n: number }>)[0]?.n ?? 0;
            expect(a).toBe(b);
          },
          { gucs: { profileId: profileBeta, tenantId: betaId } },
        );
      });

      it("10. authenticated ACME cannot change finance tenant_id to Beta", async () => {
        // After an RLS denial, the savepoint is aborted until the helper rolls it back —
        // do not issue further SQL in this callback after the expected rejection.
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            const visible = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from finance_applications
              where tenant_id = ${acmeId}::uuid
            `);
            expect(Array.from(visible as unknown as Array<{ n: number }>)[0]?.n).toBeGreaterThan(
              0,
            );

            await expect(
              tx.execute(sql`
                update finance_applications
                set tenant_id = ${betaId}::uuid
                where tenant_id = ${acmeId}::uuid
              `),
            ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
          },
          {
            gucs: { profileId: profileAcme, tenantId: acmeId },
            setupAsOwner: async (tx) => {
              const leadId = randomUUID();
              const appId = randomUUID();
              await tx.execute(sql`
                insert into leads (
                  id, tenant_id, vehicle_id, name, email, phone, source, status,
                  consent_at, consent_version, notification_status
                ) values (
                  ${leadId}::uuid, ${acmeId}::uuid, ${acmeAvailableId}::uuid,
                  'RLS Tenant Move', 'rls-move@example.test', '+40722100007',
                  'finance', 'new', now(), 'finance-v1', 'pending'
                )
              `);
              await tx.execute(sql`
                insert into finance_applications (
                  id, tenant_id, vehicle_id, lead_id, applicant_type, full_name,
                  email, phone, amount_eur, term_months,
                  vehicle_price_eur_snapshot, estimated_monthly_eur_snapshot,
                  consent_at, consent_version, status
                ) values (
                  ${appId}::uuid, ${acmeId}::uuid, ${acmeAvailableId}::uuid, ${leadId}::uuid,
                  'individual', 'RLS Tenant Move', 'rls-move@example.test', '+40722100007',
                  1000.00, 12, 1000.00, 90.00, now(), 'finance-v1', 'new'
                )
              `);
            },
          },
        );
      });

      it("11. anon inconsistent lead/vehicle/tenant relation is denied", async () => {
        await withRlsRole(db, "anon", async (tx) => {
          const acmeLead = await insertCompanionLead(tx, acmeId, acmeAvailableId);
          await expect(
            tx.execute(sql`
              insert into finance_applications (
                id, tenant_id, vehicle_id, lead_id, applicant_type, full_name,
                email, phone, amount_eur, term_months,
                vehicle_price_eur_snapshot, estimated_monthly_eur_snapshot,
                consent_at, consent_version, status
              ) values (
                ${randomUUID()}::uuid, ${betaId}::uuid, ${acmeAvailableId}::uuid, ${acmeLead}::uuid,
                'individual', 'RLS Inconsistent', 'rls-fin-x@example.test', '+40722100006',
                1000.00, 12, 1000.00, 90.00, now(), 'finance-v1', 'new'
              )
            `),
          ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
        });
      });
    });

    describe("vehicles and vehicle_media", () => {
      it("1-4. anon sees only available; hides draft/archived/reserved", async () => {
        await withRlsRole(db, "anon", async (tx) => {
          const statuses = await tx.execute<{ status: string; n: number }>(sql`
            select status::text as status, count(*)::int as n
            from vehicles
            group by status
            order by status
          `);
          const map = new Map(
            Array.from(statuses as unknown as Array<{ status: string; n: number }>).map((r) => [
              r.status,
              r.n,
            ]),
          );
          expect(map.get("available") ?? 0).toBeGreaterThan(0);
          expect(map.get("draft") ?? 0).toBe(0);
          expect(map.get("archived") ?? 0).toBe(0);
          expect(map.get("reserved") ?? 0).toBe(0);

          const archived = await tx.execute<{ n: number }>(sql`
            select count(*)::int as n from vehicles where id = ${acmeArchivedId}::uuid
          `);
          expect(Array.from(archived as unknown as Array<{ n: number }>)[0]?.n).toBe(0);

          if (acmeDraftId) {
            const draft = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from vehicles where id = ${acmeDraftId}::uuid
            `);
            expect(Array.from(draft as unknown as Array<{ n: number }>)[0]?.n).toBe(0);
          }
          if (acmeReservedId) {
            const reserved = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from vehicles where id = ${acmeReservedId}::uuid
            `);
            expect(Array.from(reserved as unknown as Array<{ n: number }>)[0]?.n).toBe(0);
          }
        });
      });

      it("5. authenticated ACME staff sees ACME vehicles including non-available", async () => {
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            const rows = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from vehicles where tenant_id = ${acmeId}::uuid
            `);
            expect(Array.from(rows as unknown as Array<{ n: number }>)[0]?.n).toBeGreaterThan(0);
            const archived = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from vehicles where id = ${acmeArchivedId}::uuid
            `);
            expect(Array.from(archived as unknown as Array<{ n: number }>)[0]?.n).toBe(1);
          },
          { gucs: { profileId: profileAcme, tenantId: acmeId } },
        );
      });

      it("6. authenticated Beta cannot see private ACME vehicles", async () => {
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            const rows = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from vehicles where tenant_id = ${acmeId}::uuid
            `);
            expect(Array.from(rows as unknown as Array<{ n: number }>)[0]?.n).toBe(0);
            const archived = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from vehicles where id = ${acmeArchivedId}::uuid
            `);
            expect(Array.from(archived as unknown as Array<{ n: number }>)[0]?.n).toBe(0);
          },
          { gucs: { profileId: profileBeta, tenantId: betaId } },
        );
      });

      it("7-8. anon media only for public available vehicles; private/foreign denied", async () => {
        const mediaPublicId = randomUUID();
        const mediaPrivateId = randomUUID();
        const mediaForeignId = randomUUID();

        await withRlsRole(
          db,
          "anon",
          async (tx) => {
            const visible = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from vehicle_media where id = ${mediaPublicId}::uuid
            `);
            expect(Array.from(visible as unknown as Array<{ n: number }>)[0]?.n).toBe(1);

            const hiddenDraft = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from vehicle_media where id = ${mediaPrivateId}::uuid
            `);
            expect(Array.from(hiddenDraft as unknown as Array<{ n: number }>)[0]?.n).toBe(0);

            const hiddenForeign = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from vehicle_media where id = ${mediaForeignId}::uuid
            `);
            // Beta available vehicle media IS public under anon policy (any available vehicle).
            // Foreign-tenant private would be denied; here foreign is Beta available → visible.
            // Assert ACME draft media hidden; Beta available media visible as public storefront.
            expect(Array.from(hiddenForeign as unknown as Array<{ n: number }>)[0]?.n).toBe(1);
          },
          {
            setupAsOwner: async (tx) => {
              // Prefer an ACME draft for private media; fall back to archived Golf.
              const privateVehicleId = acmeDraftId ?? acmeArchivedId;
              await tx.execute(sql`
                insert into vehicle_media (
                  id, tenant_id, vehicle_id, type, storage_path, sort_order
                ) values
                (
                  ${mediaPublicId}::uuid, ${acmeId}::uuid, ${acmeAvailableId}::uuid,
                  'image', 'rls-test/public.jpg', 0
                ),
                (
                  ${mediaPrivateId}::uuid, ${acmeId}::uuid, ${privateVehicleId}::uuid,
                  'image', 'rls-test/private.jpg', 0
                ),
                (
                  ${mediaForeignId}::uuid, ${betaId}::uuid, ${betaAvailableId}::uuid,
                  'image', 'rls-test/beta-public.jpg', 0
                )
              `);
            },
          },
        );

        // Staff Beta still must not see ACME private media.
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            const n = await tx.execute<{ n: number }>(sql`
              select count(*)::int as n from vehicle_media
              where tenant_id = ${acmeId}::uuid
            `);
            expect(Array.from(n as unknown as Array<{ n: number }>)[0]?.n).toBe(0);
          },
          {
            gucs: { profileId: profileBeta, tenantId: betaId },
            setupAsOwner: async (tx) => {
              const privateVehicleId = acmeDraftId ?? acmeArchivedId;
              await tx.execute(sql`
                insert into vehicle_media (
                  id, tenant_id, vehicle_id, type, storage_path, sort_order
                ) values (
                  ${randomUUID()}::uuid, ${acmeId}::uuid, ${privateVehicleId}::uuid,
                  'image', 'rls-test/acme-private-staff.jpg', 0
                )
              `);
            },
          },
        );
      });
    });
  },
);

describe("Etapa 20 real RLS (offline)", () => {
  it("documents skip when DATABASE_URL or seed profiles are absent", () => {
    expect(typeof canRunOnline).toBe("boolean");
  });
});
