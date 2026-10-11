/**
 * Etapa 26B — billing / entitlements RLS + SECURITY DEFINER checkout activation.
 */

import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { seedDevTenants } from "../seed/dev-tenants";
import { billingCheckoutSessions } from "../schema/billing";
import { billingWebhookEvents } from "../schema/billing";
import { tenantEntitlements } from "../schema/billing";
import { tenants } from "../schema/tenants";
import {
  IntentionalRlsRollback,
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
  "Etapa 26B billing RLS + checkout activation (SET LOCAL ROLE)",
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

    it("anon cannot read entitlements / checkout / webhook events", async () => {
      await withRlsRole(db, "anon", async (tx) => {
        const entitlements = await tx.select().from(tenantEntitlements).limit(5);
        expect(entitlements).toEqual([]);
        const checkouts = await tx.select().from(billingCheckoutSessions).limit(5);
        expect(checkouts).toEqual([]);
        const events = await tx.select().from(billingWebhookEvents).limit(5);
        expect(events).toEqual([]);
        throw new IntentionalRlsRollback();
      }).catch((error) => {
        if (!(error instanceof IntentionalRlsRollback)) throw error;
      });
    });

    it("authenticated cannot execute activate_tenant_from_checkout (server-only)", async () => {
      await withRlsRole(db, "authenticated", async (tx) => {
        try {
          await tx.execute(sql`
            select app.activate_tenant_from_checkout(
              'noop',
              'evt_should_deny',
              'checkout.session.completed',
              'noop_cs_should_deny',
              'noop_sub_x',
              null
            )
          `);
          expect.fail("activate should be denied for authenticated");
        } catch (error) {
          expect(isRlsOrPrivilegeDenial(error)).toBe(true);
        }
        throw new IntentionalRlsRollback();
      }).catch((error) => {
        if (!(error instanceof IntentionalRlsRollback)) throw error;
      });
    });

    it("member cannot insert entitlements from client role", async () => {
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          try {
            await tx.insert(tenantEntitlements).values({
              tenantId: acmeId,
              planCode: "business",
              maxPublishedVehicles: 150,
              source: "manual",
            });
            expect.fail("insert should be denied");
          } catch (error) {
            expect(isRlsOrPrivilegeDenial(error)).toBe(true);
          }
          throw new IntentionalRlsRollback();
        },
        { gucs: { profileId: profileAcme, tenantId: acmeId } },
      ).catch((error) => {
        if (!(error instanceof IntentionalRlsRollback)) throw error;
      });
    });

    it("ACME member cannot read Beta entitlements", async () => {
      // Seed entitlement as table owner (bypass), then probe as ACME member.
      await db
        .insert(tenantEntitlements)
        .values({
          tenantId: betaId,
          planCode: "premium",
          maxPublishedVehicles: 500,
          source: "manual",
        })
        .onConflictDoUpdate({
          target: tenantEntitlements.tenantId,
          set: {
            planCode: "premium",
            maxPublishedVehicles: 500,
            source: "manual",
            updatedAt: new Date(),
          },
        });

      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          const rows = await tx
            .select()
            .from(tenantEntitlements)
            .where(eq(tenantEntitlements.tenantId, betaId));
          expect(rows).toEqual([]);
          throw new IntentionalRlsRollback();
        },
        { gucs: { profileId: profileAcme, tenantId: acmeId } },
      ).catch((error) => {
        if (!(error instanceof IntentionalRlsRollback)) throw error;
      });
    });

    it("begin + activate checkout is idempotent and activates suspended tenant", async () => {
      const slug = `t26b-${randomUUID().replace(/-/g, "").slice(0, 10)}`;
      const externalSession = `noop_cs_${slug}`;
      const eventId = `evt_${slug}`;
      const buyerId = randomUUID();
      const buyerEmail = `buyer-${slug}@example.com`;

      await db.execute(sql`
        insert into auth.users (
          id, aud, role, email, encrypted_password,
          email_confirmed_at, created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data,
          confirmation_token, recovery_token, email_change_token_new, email_change
        ) values (
          ${buyerId}::uuid, 'authenticated', 'authenticated',
          ${buyerEmail},
          crypt('test-password', gen_salt('bf')),
          now(), now(), now(),
          '{}'::jsonb, '{}'::jsonb,
          '', '', '', ''
        )
      `);
      await db.execute(sql`
        insert into public.profiles (id, name, email)
        values (${buyerId}::uuid, 'Buyer 26B', ${buyerEmail})
      `);

      const begun = await db.execute<{
        checkout_id: string;
        tenant_id: string;
        plan_code: string;
      }>(sql`
        select * from app.begin_self_serve_checkout(
          ${buyerId}::uuid,
          'plan_50',
          'Buyer Checkout Test',
          ${slug}
        )
      `);
      const beginRow = Array.from(
        begun as unknown as { checkout_id: string; tenant_id: string; plan_code: string }[],
      )[0];
      expect(beginRow).toBeTruthy();
      if (!beginRow) {
        throw new Error("begin_self_serve_checkout returned no row");
      }
      expect(beginRow.plan_code).toBe("plan_50");
      expect(beginRow.checkout_id).toBeTruthy();

      const [tenantBefore] = await db
        .select({ status: tenants.status })
        .from(tenants)
        .where(eq(tenants.id, beginRow.tenant_id))
        .limit(1);
      expect(tenantBefore?.status).toBe("suspended");

      const attach = await db.execute<{ attach_checkout_provider_session: string }>(sql`
        select app.attach_checkout_provider_session(
          ${beginRow.checkout_id}::uuid,
          ${buyerId}::uuid,
          'noop',
          ${externalSession}
        ) as attach_checkout_provider_session
      `);
      expect(
        Array.from(
          attach as unknown as { attach_checkout_provider_session: string }[],
        )[0]?.attach_checkout_provider_session,
      ).toBe("ok");

      const first = await db.execute<{ activate_tenant_from_checkout: string }>(sql`
        select app.activate_tenant_from_checkout(
          'noop',
          ${eventId},
          'checkout.session.completed',
          ${externalSession},
          ${`noop_sub_${slug}`},
          'hash1'
        ) as activate_tenant_from_checkout
      `);
      expect(
        Array.from(first as unknown as { activate_tenant_from_checkout: string }[])[0]
          ?.activate_tenant_from_checkout,
      ).toBe("activated");

      const [tenantAfter] = await db
        .select({ status: tenants.status })
        .from(tenants)
        .where(eq(tenants.id, beginRow.tenant_id))
        .limit(1);
      expect(tenantAfter?.status).toBe("active");

      const [entitlement] = await db
        .select()
        .from(tenantEntitlements)
        .where(eq(tenantEntitlements.tenantId, beginRow.tenant_id))
        .limit(1);
      expect(entitlement?.planCode).toBe("plan_50");
      expect(entitlement?.maxPublishedVehicles).toBe(50);

      const second = await db.execute<{ activate_tenant_from_checkout: string }>(sql`
        select app.activate_tenant_from_checkout(
          'noop',
          ${eventId},
          'checkout.session.completed',
          ${externalSession},
          ${`noop_sub_${slug}`},
          'hash1'
        ) as activate_tenant_from_checkout
      `);
      expect(
        Array.from(second as unknown as { activate_tenant_from_checkout: string }[])[0]
          ?.activate_tenant_from_checkout,
      ).toBe("duplicate");

      // Cleanup ephemeral tenant + auth user (cascade billing / membership / profile FK as allowed).
      await db.delete(tenants).where(eq(tenants.id, beginRow.tenant_id));
      await db.execute(sql`delete from public.profiles where id = ${buyerId}::uuid`);
      await db.execute(sql`delete from auth.users where id = ${buyerId}::uuid`);
    });
  },
);
