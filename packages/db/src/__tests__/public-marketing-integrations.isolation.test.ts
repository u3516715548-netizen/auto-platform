/**
 * Phase 4 — app.public_marketing_integrations whitelist isolation.
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { seedDevTenants } from "../seed/dev-tenants";
import { tenantMarketingIntegrations } from "../schema/tenant-marketing-integrations";
import { withRlsRole } from "./rls-role-helpers";

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
  "Phase 4 public_marketing_integrations SECURITY DEFINER",
  () => {
    let db: Database;
    let acmeId: string;
    let betaId: string;
    let profileAcme: string;

    beforeAll(async () => {
      db = createDb(process.env.DATABASE_URL!);
      const seeded = await seedDevTenants(process.env.DATABASE_URL!);
      acmeId = seeded.tenantA.id;
      betaId = seeded.tenantB.id;
      profileAcme = seeded.profileA;
    });

    it("anon cannot SELECT table but can execute public helper for active tenant", async () => {
      await withRlsRole(
        db,
        "anon",
        async (tx) => {
          const direct = await tx.select().from(tenantMarketingIntegrations);
          expect(direct).toHaveLength(0);

          const pub = await tx.execute<{
            gtm_container_id: string | null;
            meta_pixel_id: string | null;
            meta_pixel_enabled: boolean;
            google_search_console_verification: string | null;
          }>(sql`
            select gtm_container_id, meta_pixel_id, meta_pixel_enabled,
                   google_search_console_verification
            from app.public_marketing_integrations(${acmeId}::uuid)
          `);
          const row = Array.from(pub as unknown as Array<{
            gtm_container_id: string | null;
            meta_pixel_id: string | null;
            meta_pixel_enabled: boolean;
            google_search_console_verification: string | null;
          }>)[0];
          expect(row?.gtm_container_id).toBe("GTM-PUBACME");
          expect(row?.google_search_console_verification).toBe("gsc-acme-token");
          expect(row?.meta_pixel_enabled).toBe(false);
        },
        {
          gucs: null,
          setupAsOwner: async (tx) => {
            await tx
              .insert(tenantMarketingIntegrations)
              .values({
                tenantId: acmeId,
                gtmContainerId: "GTM-PUBACME",
                gtmEnabled: true,
                googleSearchConsoleVerification: "gsc-acme-token",
                metaPixelId: "111111111111111",
                metaPixelEnabled: false,
              })
              .onConflictDoUpdate({
                target: tenantMarketingIntegrations.tenantId,
                set: {
                  gtmContainerId: "GTM-PUBACME",
                  gtmEnabled: true,
                  googleSearchConsoleVerification: "gsc-acme-token",
                  metaPixelId: "111111111111111",
                  metaPixelEnabled: false,
                  updatedAt: new Date(),
                },
              });
          },
        },
      );
    });

    it("public helper for beta does not return ACME IDs", async () => {
      await withRlsRole(
        db,
        "anon",
        async (tx) => {
          const pub = await tx.execute<{ gtm_container_id: string | null }>(sql`
            select gtm_container_id from app.public_marketing_integrations(${betaId}::uuid)
          `);
          const row = Array.from(
            pub as unknown as Array<{ gtm_container_id: string | null }>,
          )[0];
          expect(row?.gtm_container_id).toBe("GTM-PUBBETA");
          expect(row?.gtm_container_id).not.toBe("GTM-PUBACME");
        },
        {
          gucs: null,
          setupAsOwner: async (tx) => {
            await tx
              .insert(tenantMarketingIntegrations)
              .values({
                tenantId: betaId,
                gtmContainerId: "GTM-PUBBETA",
                gtmEnabled: true,
              })
              .onConflictDoUpdate({
                target: tenantMarketingIntegrations.tenantId,
                set: {
                  gtmContainerId: "GTM-PUBBETA",
                  gtmEnabled: true,
                  updatedAt: new Date(),
                },
              });
          },
        },
      );
    });

    it("owner SELECT reads own row in same transaction", async () => {
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          await tx
            .insert(tenantMarketingIntegrations)
            .values({
              tenantId: acmeId,
              gtmContainerId: "GTM-OWNR01",
              gtmEnabled: true,
            })
            .onConflictDoUpdate({
              target: tenantMarketingIntegrations.tenantId,
              set: {
                gtmContainerId: "GTM-OWNR01",
                gtmEnabled: true,
                updatedAt: new Date(),
              },
            });

          const rows = await tx
            .select({ gtm: tenantMarketingIntegrations.gtmContainerId })
            .from(tenantMarketingIntegrations)
            .where(eq(tenantMarketingIntegrations.tenantId, acmeId));
          expect(rows[0]?.gtm).toBe("GTM-OWNR01");
        },
        { gucs: { profileId: profileAcme, tenantId: acmeId } },
      );
    });
  },
);
