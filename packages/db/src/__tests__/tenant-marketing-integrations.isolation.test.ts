/**
 * Phase 3 — tenant_marketing_integrations RLS (owner-only, no anon).
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
import { tenantMarketingIntegrations } from "../schema/tenant-marketing-integrations";
import { isRlsOrPrivilegeDenial, withRlsRole } from "./rls-role-helpers";

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
  "Phase 3 marketing integrations RLS (SET LOCAL ROLE, rolbypassrls=false)",
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

    it("FORCE RLS enabled; anon has no SELECT", async () => {
      const forced = await db.execute<{ relforcerowsecurity: boolean }>(sql`
        select c.relforcerowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'tenant_marketing_integrations'
      `);
      expect(Array.from(forced as unknown as Array<{ relforcerowsecurity: boolean }>)[0]
        ?.relforcerowsecurity).toBe(true);

      await withRlsRole(
        db,
        "anon",
        async (tx) => {
          const rows = await tx.select().from(tenantMarketingIntegrations);
          expect(rows).toHaveLength(0);
        },
        { gucs: null },
      );
    });

    it("owner ACME upsert; member cannot SELECT; beta owner cannot read ACME", async () => {
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          await tx
            .insert(tenantMarketingIntegrations)
            .values({
              tenantId: acmeId,
              gtmContainerId: "GTM-ACME01",
              ga4MeasurementId: "G-ACME01XX",
              gtmEnabled: true,
              ga4Enabled: true,
            })
            .onConflictDoUpdate({
              target: tenantMarketingIntegrations.tenantId,
              set: {
                gtmContainerId: "GTM-ACME01",
                ga4MeasurementId: "G-ACME01XX",
                updatedAt: new Date(),
              },
            });

          const rows = await tx
            .select({
              gtm: tenantMarketingIntegrations.gtmContainerId,
              ga4: tenantMarketingIntegrations.ga4MeasurementId,
            })
            .from(tenantMarketingIntegrations)
            .where(eq(tenantMarketingIntegrations.tenantId, acmeId));
          expect(rows[0]?.gtm).toBe("GTM-ACME01");
          expect(rows[0]?.ga4).toBe("G-ACME01XX");
        },
        { gucs: { profileId: profileAcme, tenantId: acmeId } },
      );

      const memberId = randomUUID();
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          const rows = await tx
            .select()
            .from(tenantMarketingIntegrations)
            .where(eq(tenantMarketingIntegrations.tenantId, acmeId));
          expect(rows).toHaveLength(0);

          await expect(
            tx.insert(tenantMarketingIntegrations).values({
              tenantId: acmeId,
              gtmContainerId: "GTM-HACK01",
            }),
          ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
        },
        {
          gucs: { profileId: memberId, tenantId: acmeId },
          setupAsOwner: async (tx) => {
            await insertEphemeralAuthProfile(tx, {
              id: memberId,
              email: `sales-${memberId.slice(0, 8)}@acme.test`,
              name: "Sales Member",
            });
            await tx.insert(memberships).values({
              profileId: memberId,
              tenantId: acmeId,
              role: "sales",
            });
          },
        },
      );

      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          const leaked = await tx
            .select()
            .from(tenantMarketingIntegrations)
            .where(eq(tenantMarketingIntegrations.tenantId, acmeId));
          expect(leaked).toHaveLength(0);
        },
        { gucs: { profileId: profileBeta, tenantId: betaId } },
      );
    });

    it("owner can clear IDs (update to null)", async () => {
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          await tx
            .insert(tenantMarketingIntegrations)
            .values({
              tenantId: acmeId,
              gtmContainerId: "GTM-TMPCLR",
              ga4MeasurementId: "G-TMPCLEAR1",
            })
            .onConflictDoUpdate({
              target: tenantMarketingIntegrations.tenantId,
              set: {
                gtmContainerId: "GTM-TMPCLR",
                ga4MeasurementId: "G-TMPCLEAR1",
                updatedAt: new Date(),
              },
            });

          await tx
            .update(tenantMarketingIntegrations)
            .set({
              gtmContainerId: null,
              ga4MeasurementId: null,
              updatedAt: new Date(),
            })
            .where(eq(tenantMarketingIntegrations.tenantId, acmeId));

          const rows = await tx
            .select({
              gtm: tenantMarketingIntegrations.gtmContainerId,
            })
            .from(tenantMarketingIntegrations)
            .where(eq(tenantMarketingIntegrations.tenantId, acmeId));
          expect(rows).toHaveLength(1);
          expect(rows[0]?.gtm).toBeNull();
        },
        { gucs: { profileId: profileAcme, tenantId: acmeId } },
      );
    });
  },
);
