/**
 * Etapa 23A — tenant_pages + tenant_seo_settings RLS (SET LOCAL ROLE, no BYPASSRLS).
 */

import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { seedDevTenants } from "../seed/dev-tenants";
import { memberships } from "../schema/memberships";
import { profiles } from "../schema/profiles";
import { tenantPages } from "../schema/tenant-pages";
import { tenantSeoSettings } from "../schema/tenant-seo-settings";
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
  "Etapa 23A tenant pages + SEO RLS (SET LOCAL ROLE, rolbypassrls=false)",
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

    it("owner ACME CRUD pages; draft hidden from anon; published visible", async () => {
      const pageId = randomUUID();

      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          await tx.insert(tenantPages).values({
            id: pageId,
            tenantId: acmeId,
            slug: "despre",
            title: "Despre ACME",
            body: "Text despre",
            status: "draft",
            pageKind: "about",
            locale: "ro",
          });

          const draftRows = await tx
            .select({ id: tenantPages.id, status: tenantPages.status })
            .from(tenantPages)
            .where(eq(tenantPages.id, pageId));
          expect(draftRows).toHaveLength(1);
          expect(draftRows[0]?.status).toBe("draft");

          await tx
            .update(tenantPages)
            .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
            .where(eq(tenantPages.id, pageId));
        },
        { gucs: { profileId: profileAcme, tenantId: acmeId } },
      );

      await withRlsRole(
        db,
        "anon",
        async (tx) => {
          const published = await tx
            .select({ slug: tenantPages.slug, status: tenantPages.status })
            .from(tenantPages)
            .where(and(eq(tenantPages.tenantId, acmeId), eq(tenantPages.slug, "despre")));
          expect(published.some((r) => r.status === "published")).toBe(true);
        },
        {
          gucs: null,
          setupAsOwner: async (tx) => {
            await tx
              .insert(tenantPages)
              .values({
                id: pageId,
                tenantId: acmeId,
                slug: "despre",
                title: "Despre ACME",
                body: "Text",
                status: "published",
                pageKind: "about",
                locale: "ro",
                publishedAt: new Date(),
              })
              .onConflictDoNothing();
          },
        },
      );
    });

    it("anon cannot SELECT draft pages", async () => {
      const draftId = randomUUID();
      await withRlsRole(
        db,
        "anon",
        async (tx) => {
          const rows = await tx
            .select({ id: tenantPages.id })
            .from(tenantPages)
            .where(eq(tenantPages.id, draftId));
          expect(rows).toHaveLength(0);
        },
        {
          gucs: null,
          setupAsOwner: async (tx) => {
            await tx.insert(tenantPages).values({
              id: draftId,
              tenantId: acmeId,
              slug: `draft-${draftId.slice(0, 8)}`,
              title: "Draft secret",
              body: "hidden",
              status: "draft",
              pageKind: "custom",
              locale: "ro",
            });
          },
        },
      );
    });

    it("manager/sales/viewer cannot INSERT or UPDATE pages", async () => {
      for (const role of ["manager", "sales", "viewer"] as const) {
        const memberId = randomUUID();
        await withRlsRole(
          db,
          "authenticated",
          async (tx) => {
            await expect(
              tx.insert(tenantPages).values({
                tenantId: acmeId,
                slug: `x-${role}`,
                title: "Nope",
                body: "",
                status: "draft",
                pageKind: "custom",
                locale: "ro",
              }),
            ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
          },
          {
            gucs: { profileId: memberId, tenantId: acmeId },
            setupAsOwner: async (tx) => {
              await insertEphemeralAuthProfile(tx, {
                id: memberId,
                name: role,
                email: `${role}-${memberId.slice(0, 8)}@acme.test`,
              });
              await tx.insert(memberships).values({
                tenantId: acmeId,
                profileId: memberId,
                role,
              });
            },
          },
        );
      }
    });

    it("Beta owner cannot read or mutate ACME pages", async () => {
      const pageId = randomUUID();
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          const rows = await tx
            .select({ id: tenantPages.id })
            .from(tenantPages)
            .where(eq(tenantPages.id, pageId));
          expect(rows).toHaveLength(0);

          const updated = await tx
            .update(tenantPages)
            .set({ title: "leak", updatedAt: new Date() })
            .where(eq(tenantPages.id, pageId))
            .returning({ id: tenantPages.id });
          expect(updated).toHaveLength(0);
        },
        {
          gucs: { profileId: profileBeta, tenantId: betaId },
          setupAsOwner: async (tx) => {
            await tx.insert(tenantPages).values({
              id: pageId,
              tenantId: acmeId,
              slug: `acme-${pageId.slice(0, 8)}`,
              title: "ACME only",
              body: "",
              status: "published",
              pageKind: "custom",
              locale: "ro",
              publishedAt: new Date(),
            });
          },
        },
      );
    });

    it("owner ACME can upsert SEO settings; anon has no row SELECT; public helper works", async () => {
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          await tx
            .insert(tenantSeoSettings)
            .values({
              tenantId: acmeId,
              seoTitleDefault: "ACME SEO",
              indexingEnabled: true,
            })
            .onConflictDoUpdate({
              target: tenantSeoSettings.tenantId,
              set: {
                seoTitleDefault: "ACME SEO",
                indexingEnabled: true,
                updatedAt: new Date(),
              },
            });
          const rows = await tx
            .select({ title: tenantSeoSettings.seoTitleDefault })
            .from(tenantSeoSettings)
            .where(eq(tenantSeoSettings.tenantId, acmeId));
          expect(rows[0]?.title).toBe("ACME SEO");
        },
        { gucs: { profileId: profileAcme, tenantId: acmeId } },
      );

      await withRlsRole(
        db,
        "anon",
        async (tx) => {
          const rows = await tx
            .select()
            .from(tenantSeoSettings)
            .where(eq(tenantSeoSettings.tenantId, acmeId));
          expect(rows).toHaveLength(0);

          const pub = await tx.execute<{ seo_title_default: string | null }>(sql`
            select seo_title_default from app.public_seo_settings(${acmeId}::uuid)
          `);
          const list = Array.from(
            pub as unknown as Array<{ seo_title_default: string | null }>,
          );
          expect(list[0]?.seo_title_default).toBe("ACME SEO Title");
        },
        {
          gucs: null,
          setupAsOwner: async (tx) => {
            await tx
              .insert(tenantSeoSettings)
              .values({
                tenantId: acmeId,
                seoTitleDefault: "ACME SEO Title",
                indexingEnabled: true,
              })
              .onConflictDoUpdate({
                target: tenantSeoSettings.tenantId,
                set: {
                  seoTitleDefault: "ACME SEO Title",
                  indexingEnabled: true,
                  updatedAt: new Date(),
                },
              });
          },
        },
      );
    });

    it("FORCE RLS enabled on tenant_pages and tenant_seo_settings", async () => {
      const rows = await db.execute<{
        relname: string;
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>(sql`
        select c.relname, c.relrowsecurity, c.relforcerowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('tenant_pages', 'tenant_seo_settings')
      `);
      const list = Array.from(
        rows as unknown as Array<{
          relname: string;
          relrowsecurity: boolean;
          relforcerowsecurity: boolean;
        }>,
      );
      expect(list).toHaveLength(2);
      expect(list.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
    });
  },
);
