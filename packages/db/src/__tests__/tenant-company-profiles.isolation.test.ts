/**
 * Etapa 22 — tenant_company_profiles RLS (SET LOCAL ROLE, no BYPASSRLS).
 */

import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { seedDevTenants } from "../seed/dev-tenants";
import { memberships } from "../schema/memberships";
import { profiles } from "../schema/profiles";
import { tenantCompanyProfiles } from "../schema/tenant-company-profiles";
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

async function insertEphemeralAuthProfile(
  tx: Database,
  input: { id: string; email: string; name: string },
): Promise<void> {
  await tx.execute(sql`
    insert into auth.users (
      id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      ${input.id}::uuid, 'authenticated', 'authenticated',
      ${input.email},
      crypt('test-password', gen_salt('bf')),
      now(), now(), now(),
      '{}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    )
  `);
  await tx.insert(profiles).values({
    id: input.id,
    name: input.name,
    email: input.email,
  });
}

describe.skipIf(!canRunOnline)(
  "Etapa 22 tenant company profiles RLS (SET LOCAL ROLE, rolbypassrls=false)",
  () => {
    let db: Database;
    let acmeId: string;
    let betaId: string;
    let profileAcme: string;
    let profileBeta: string;

    beforeAll(async () => {
      db = createDb(process.env.DATABASE_URL!);
      const seeded = await seedDevTenants(process.env.DATABASE_URL!);
      acmeId = seeded.tenantA.id;
      betaId = seeded.tenantB.id;
      profileAcme = seeded.profileA;
      profileBeta = seeded.profileB;
    });

    it("owner ACME can insert/update company profile", async () => {
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          await tx
            .insert(tenantCompanyProfiles)
            .values({
              tenantId: acmeId,
              legalName: "ACME Motors SRL",
              tradingName: "ACME Motors",
              taxId: "1593112",
              publicEmail: "contact@acme.test",
              currency: "EUR",
            })
            .onConflictDoUpdate({
              target: tenantCompanyProfiles.tenantId,
              set: {
                legalName: "ACME Motors SRL",
                tradingName: "ACME Motors",
                taxId: "1593112",
                publicEmail: "contact@acme.test",
                updatedAt: new Date(),
              },
            });

          const rows = await tx
            .select({
              tenantId: tenantCompanyProfiles.tenantId,
              taxId: tenantCompanyProfiles.taxId,
            })
            .from(tenantCompanyProfiles)
            .where(eq(tenantCompanyProfiles.tenantId, acmeId));
          expect(rows).toHaveLength(1);
          expect(rows[0]?.taxId).toBe("1593112");
        },
        { gucs: { profileId: profileAcme, tenantId: acmeId } },
      );
    });

    it("manager/sales/viewer ACME cannot UPDATE company profile", async () => {
      for (const role of ["manager", "sales", "viewer"] as const) {
        const memberId = randomUUID();
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            // Postgres RLS UPDATE with failed USING returns 0 rows (no throw).
            const updated = await tx
              .update(tenantCompanyProfiles)
              .set({
                legalName: `Hacked by ${role}`,
                updatedAt: new Date(),
              })
              .where(eq(tenantCompanyProfiles.tenantId, acmeId))
              .returning({ legalName: tenantCompanyProfiles.legalName });
            expect(updated).toHaveLength(0);

            const rows = await tx
              .select({ legalName: tenantCompanyProfiles.legalName })
              .from(tenantCompanyProfiles)
              .where(eq(tenantCompanyProfiles.tenantId, acmeId));
            expect(rows[0]?.legalName).toBe("ACME Owner Legal");
          },
          {
            gucs: { profileId: memberId, tenantId: acmeId },
            setupAsOwner: async (tx) => {
              await insertEphemeralAuthProfile(tx, {
                id: memberId,
                name: `${role} Acme`,
                email: `${role}-${memberId.slice(0, 8)}@acme.test`,
              });
              await tx.insert(memberships).values({
                tenantId: acmeId,
                profileId: memberId,
                role,
              });
              await tx
                .insert(tenantCompanyProfiles)
                .values({
                  tenantId: acmeId,
                  tradingName: "ACME",
                  legalName: "ACME Owner Legal",
                  currency: "EUR",
                })
                .onConflictDoUpdate({
                  target: tenantCompanyProfiles.tenantId,
                  set: {
                    legalName: "ACME Owner Legal",
                    updatedAt: new Date(),
                  },
                });
            },
          },
        );
      }
    });

    it("Beta owner cannot read or update ACME company profile", async () => {
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          const rows = await tx
            .select({ tenantId: tenantCompanyProfiles.tenantId })
            .from(tenantCompanyProfiles)
            .where(eq(tenantCompanyProfiles.tenantId, acmeId));
          expect(rows).toHaveLength(0);

          const updated = await tx
            .update(tenantCompanyProfiles)
            .set({ legalName: "Beta leak", updatedAt: new Date() })
            .where(eq(tenantCompanyProfiles.tenantId, acmeId))
            .returning({ legalName: tenantCompanyProfiles.legalName });
          expect(updated).toHaveLength(0);
        },
        {
          gucs: { profileId: profileBeta, tenantId: betaId },
          setupAsOwner: async (tx) => {
            await tx
              .insert(tenantCompanyProfiles)
              .values({
                tenantId: acmeId,
                tradingName: "ACME",
                taxId: "1593112",
                currency: "EUR",
              })
              .onConflictDoNothing();
          },
        },
      );
    });

    it("anon cannot SELECT full company profile row", async () => {
      await withRlsRole(
        db,
        "anon",
        async (tx) => {
          const rows = await tx
            .select()
            .from(tenantCompanyProfiles)
            .where(eq(tenantCompanyProfiles.tenantId, acmeId));
          expect(rows).toHaveLength(0);
        },
        {
          gucs: null,
          setupAsOwner: async (tx) => {
            await tx
              .insert(tenantCompanyProfiles)
              .values({
                tenantId: acmeId,
                tradingName: "ACME",
                taxId: "1593112",
                publicEmail: "private-row@acme.test",
                currency: "EUR",
              })
              .onConflictDoUpdate({
                target: tenantCompanyProfiles.tenantId,
                set: {
                  taxId: "1593112",
                  publicEmail: "private-row@acme.test",
                  updatedAt: new Date(),
                },
              });
          },
        },
      );
    });

    it("anon can read only public projection via app.public_company_profile", async () => {
      await withRlsRole(
        db,
        "anon",
        async (tx) => {
          const rows = await tx.execute<{
            legal_name: string | null;
            tax_id: string | null;
            public_email: string | null;
            currency: string | null;
          }>(sql`
            select legal_name, tax_id, public_email, currency
            from app.public_company_profile(${acmeId}::uuid)
          `);
          const list = Array.from(
            rows as unknown as Array<{
              legal_name: string | null;
              tax_id: string | null;
              public_email: string | null;
              currency: string | null;
            }>,
          );
          expect(list.length).toBeGreaterThanOrEqual(1);
          expect(list[0]?.tax_id).toBe("1593112");
          expect(list[0]?.public_email).toBe("contact@acme.test");
          // Projection has no tenant_id / timestamps columns in result shape above.
          expect(list[0]).not.toHaveProperty("tenant_id");
          expect(list[0]).not.toHaveProperty("created_at");
        },
        {
          gucs: null,
          setupAsOwner: async (tx) => {
            await tx
              .insert(tenantCompanyProfiles)
              .values({
                tenantId: acmeId,
                legalName: "ACME Motors SRL",
                tradingName: "ACME Motors",
                taxId: "1593112",
                publicEmail: "contact@acme.test",
                currency: "EUR",
              })
              .onConflictDoUpdate({
                target: tenantCompanyProfiles.tenantId,
                set: {
                  legalName: "ACME Motors SRL",
                  taxId: "1593112",
                  publicEmail: "contact@acme.test",
                  updatedAt: new Date(),
                },
              });
          },
        },
      );
    });

    it("member ACME can SELECT own company profile (read)", async () => {
      const managerId = randomUUID();
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          const rows = await tx
            .select({
              tenantId: tenantCompanyProfiles.tenantId,
              tradingName: tenantCompanyProfiles.tradingName,
            })
            .from(tenantCompanyProfiles)
            .where(eq(tenantCompanyProfiles.tenantId, acmeId));
          expect(rows).toHaveLength(1);
          expect(rows[0]?.tenantId).toBe(acmeId);
        },
        {
          gucs: { profileId: managerId, tenantId: acmeId },
          setupAsOwner: async (tx) => {
            await insertEphemeralAuthProfile(tx, {
              id: managerId,
              name: "Mgr Read",
              email: `mgr-read-${managerId.slice(0, 8)}@acme.test`,
            });
            await tx.insert(memberships).values({
              tenantId: acmeId,
              profileId: managerId,
              role: "manager",
            });
            await tx
              .insert(tenantCompanyProfiles)
              .values({
                tenantId: acmeId,
                tradingName: "ACME",
                currency: "EUR",
              })
              .onConflictDoNothing();
          },
        },
      );
    });

    it("manager ACME cannot INSERT company profile (owner-only)", async () => {
      const managerId = randomUUID();
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          await expect(
            tx.insert(tenantCompanyProfiles).values({
              tenantId: acmeId,
              tradingName: "Mgr Insert",
              currency: "EUR",
            }),
          ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
        },
        {
          gucs: { profileId: managerId, tenantId: acmeId },
          setupAsOwner: async (tx) => {
            await insertEphemeralAuthProfile(tx, {
              id: managerId,
              name: "Mgr Insert",
              email: `mgr-ins-${managerId.slice(0, 8)}@acme.test`,
            });
            await tx.insert(memberships).values({
              tenantId: acmeId,
              profileId: managerId,
              role: "manager",
            });
            // Ensure no existing profile so INSERT is attempted (not conflict).
            await tx
              .delete(tenantCompanyProfiles)
              .where(eq(tenantCompanyProfiles.tenantId, acmeId));
          },
        },
      );
    });

    it("FORCE RLS is enabled on tenant_company_profiles", async () => {
      const rows = await db.execute<{
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>(sql`
        select c.relrowsecurity, c.relforcerowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'tenant_company_profiles'
      `);
      const list = Array.from(
        rows as unknown as Array<{
          relrowsecurity: boolean;
          relforcerowsecurity: boolean;
        }>,
      );
      expect(list[0]?.relrowsecurity).toBe(true);
      expect(list[0]?.relforcerowsecurity).toBe(true);
    });
  },
);
