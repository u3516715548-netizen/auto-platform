/**
 * Etapa 21 — tenant_invitations + membership owner-only RLS (no BYPASSRLS).
 */

import { config as loadEnv } from "dotenv";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database } from "../client";
import { seedDevTenants } from "../seed/dev-tenants";
import { memberships } from "../schema/memberships";
import { profiles } from "../schema/profiles";
import { tenantInvitations } from "../schema/tenant-invitations";
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

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function rawToken(): string {
  return randomBytes(32).toString("hex");
}

/** Ephemeral Auth user + profile (rolled back with the test transaction). */
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
  "Etapa 21 tenant invitations RLS (SET LOCAL ROLE, rolbypassrls=false)",
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

    it("owner ACME sees only ACME invitations; Beta owner does not", async () => {
      const inviteId = randomUUID();
      const token = rawToken();

      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          const rows = await tx
            .select({ id: tenantInvitations.id, tenantId: tenantInvitations.tenantId })
            .from(tenantInvitations)
            .where(eq(tenantInvitations.tenantId, acmeId));
          expect(rows.some((r) => r.id === inviteId)).toBe(true);
          expect(rows.every((r) => r.tenantId === acmeId)).toBe(true);
        },
        {
          gucs: { profileId: profileAcme, tenantId: acmeId },
          setupAsOwner: async (tx) => {
            await tx.insert(tenantInvitations).values({
              id: inviteId,
              tenantId: acmeId,
              email: "invitee-acme@example.test",
              role: "viewer",
              tokenHash: hashToken(token),
              invitedByProfileId: profileAcme,
              status: "pending",
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });
          },
        },
      );

      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          const rows = await tx
            .select({ id: tenantInvitations.id })
            .from(tenantInvitations)
            .where(eq(tenantInvitations.id, inviteId));
          expect(rows).toHaveLength(0);
        },
        { gucs: { profileId: profileBeta, tenantId: betaId } },
      );
    });

    it("anon cannot SELECT invitations", async () => {
      const inviteId = randomUUID();
      await withRlsRole(
        db,
        "anon",
        async (tx) => {
          const rows = await tx
            .select({ id: tenantInvitations.id })
            .from(tenantInvitations)
            .where(eq(tenantInvitations.id, inviteId));
          expect(rows).toHaveLength(0);
        },
        {
          gucs: null,
          setupAsOwner: async (tx) => {
            await tx.insert(tenantInvitations).values({
              id: inviteId,
              tenantId: acmeId,
              email: "anon-probe@example.test",
              role: "sales",
              tokenHash: hashToken(rawToken()),
              invitedByProfileId: profileAcme,
              status: "pending",
              expiresAt: new Date(Date.now() + 86400000),
            });
          },
        },
      );
    });

    it("manager ACME cannot INSERT invitations (owner-only)", async () => {
      const managerId = randomUUID();

      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          await expect(
            tx.insert(tenantInvitations).values({
              tenantId: acmeId,
              email: "manager-invite@example.test",
              role: "viewer",
              tokenHash: hashToken(rawToken()),
              invitedByProfileId: managerId,
              status: "pending",
              expiresAt: new Date(Date.now() + 86400000),
            }),
          ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
        },
        {
          gucs: { profileId: managerId, tenantId: acmeId },
          setupAsOwner: async (tx) => {
            await insertEphemeralAuthProfile(tx, {
              id: managerId,
              name: "Mgr Acme",
              email: `mgr-${managerId.slice(0, 8)}@acme.test`,
            });
            await tx.insert(memberships).values({
              tenantId: acmeId,
              profileId: managerId,
              role: "manager",
            });
          },
        },
      );
    });

    it("ACME owner cannot INSERT invitation into Beta tenant", async () => {
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          await expect(
            tx.insert(tenantInvitations).values({
              tenantId: betaId,
              email: "cross@example.test",
              role: "viewer",
              tokenHash: hashToken(rawToken()),
              invitedByProfileId: profileAcme,
              status: "pending",
              expiresAt: new Date(Date.now() + 86400000),
            }),
          ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
        },
        { gucs: { profileId: profileAcme, tenantId: acmeId } },
      );
    });

    it("manager cannot INSERT membership (owner-only after 0010)", async () => {
      const managerId = randomUUID();
      const targetId = randomUUID();

      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          await expect(
            tx.insert(memberships).values({
              tenantId: acmeId,
              profileId: targetId,
              role: "viewer",
            }),
          ).rejects.toSatisfy(isRlsOrPrivilegeDenial);
        },
        {
          gucs: { profileId: managerId, tenantId: acmeId },
          setupAsOwner: async (tx) => {
            await insertEphemeralAuthProfile(tx, {
              id: managerId,
              name: "Mgr2",
              email: `mgr2-${managerId.slice(0, 8)}@acme.test`,
            });
            await insertEphemeralAuthProfile(tx, {
              id: targetId,
              name: "Target",
              email: `tgt-${targetId.slice(0, 8)}@acme.test`,
            });
            await tx.insert(memberships).values({
              tenantId: acmeId,
              profileId: managerId,
              role: "manager",
            });
          },
        },
      );
    });

    it("accept helper: pending → membership + accepted; double accept is single-use", async () => {
      const inviteeId = randomUUID();
      const token = rawToken();
      const tokenHash = hashToken(token);
      const email = `accept-${inviteeId.slice(0, 8)}@example.test`;

      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          const first = await tx.execute<{ code: string }>(sql`
            select app.accept_tenant_invitation(
              ${tokenHash},
              ${inviteeId}::uuid,
              ${email}
            ) as code
          `);
          const firstCode = Array.from(first as unknown as Array<{ code: string }>)[0]?.code;
          expect(firstCode).toBe("ok");

          const [mem] = await tx
            .select({ role: memberships.role, tenantId: memberships.tenantId })
            .from(memberships)
            .where(
              and(eq(memberships.tenantId, acmeId), eq(memberships.profileId, inviteeId)),
            );
          expect(mem?.role).toBe("sales");
          expect(mem?.tenantId).toBe(acmeId);

          const second = await tx.execute<{ code: string }>(sql`
            select app.accept_tenant_invitation(
              ${tokenHash},
              ${inviteeId}::uuid,
              ${email}
            ) as code
          `);
          const secondCode = Array.from(second as unknown as Array<{ code: string }>)[0]?.code;
          expect(secondCode).toBe("accepted");
        },
        {
          gucs: { profileId: inviteeId, tenantId: acmeId },
          setupAsOwner: async (tx) => {
            await insertEphemeralAuthProfile(tx, {
              id: inviteeId,
              name: "Invitee",
              email,
            });
            await tx.insert(tenantInvitations).values({
              tenantId: acmeId,
              email,
              role: "sales",
              tokenHash,
              invitedByProfileId: profileAcme,
              status: "pending",
              expiresAt: new Date(Date.now() + 86400000),
            });
          },
        },
      );
    });

    it("accept helper: email mismatch and expired", async () => {
      const inviteeId = randomUUID();
      const token = rawToken();
      const tokenHash = hashToken(token);
      const expiredToken = rawToken();
      const expiredHash = hashToken(expiredToken);
      const email = `mismatch-${inviteeId.slice(0, 8)}@example.test`;

      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          const mismatch = await tx.execute<{ code: string }>(sql`
            select app.accept_tenant_invitation(
              ${tokenHash},
              ${inviteeId}::uuid,
              ${"other@example.test"}
            ) as code
          `);
          expect(Array.from(mismatch as unknown as Array<{ code: string }>)[0]?.code).toBe(
            "email_mismatch",
          );

          const expiredEmail = `expired-${inviteeId.slice(0, 8)}@example.test`;
          const expired = await tx.execute<{ code: string }>(sql`
            select app.accept_tenant_invitation(
              ${expiredHash},
              ${inviteeId}::uuid,
              ${expiredEmail}
            ) as code
          `);
          expect(Array.from(expired as unknown as Array<{ code: string }>)[0]?.code).toBe(
            "expired",
          );
        },
        {
          gucs: { profileId: inviteeId, tenantId: acmeId },
          setupAsOwner: async (tx) => {
            await insertEphemeralAuthProfile(tx, {
              id: inviteeId,
              name: "Mismatch",
              email,
            });
            await tx.insert(tenantInvitations).values([
              {
                tenantId: acmeId,
                email,
                role: "viewer",
                tokenHash,
                invitedByProfileId: profileAcme,
                status: "pending",
                expiresAt: new Date(Date.now() + 86400000),
              },
              {
                tenantId: acmeId,
                email: `expired-${inviteeId.slice(0, 8)}@example.test`,
                role: "viewer",
                tokenHash: expiredHash,
                invitedByProfileId: profileAcme,
                status: "pending",
                expiresAt: new Date(Date.now() - 3600000),
              },
            ]);
          },
        },
      );
    });

    it("tenant_member_email_exists detects existing member", async () => {
      await withRlsRole(
        db,
        "authenticated",
        async (tx) => {
          const hit = await tx.execute<{ exists: boolean }>(sql`
            select app.tenant_member_email_exists(${acmeId}::uuid, 'alice@acme.test') as exists
          `);
          const hitRow = Array.from(hit as unknown as Array<{ exists: boolean }>)[0];
          expect(hitRow?.exists === true || hitRow?.exists === ("t" as unknown)).toBe(true);

          const miss = await tx.execute<{ exists: boolean }>(sql`
            select app.tenant_member_email_exists(${acmeId}::uuid, 'nobody@example.test') as exists
          `);
          const missRow = Array.from(miss as unknown as Array<{ exists: boolean }>)[0];
          expect(missRow?.exists === true || missRow?.exists === ("t" as unknown)).toBe(false);
        },
        { gucs: { profileId: profileAcme, tenantId: acmeId } },
      );
    });

    it("schema rejects owner role on invitation insert (check constraint)", async () => {
      await expect(
        db.execute(sql`
          insert into tenant_invitations (
            tenant_id, email, role, token_hash, invited_by_profile_id, status, expires_at
          ) values (
            ${acmeId}::uuid, 'owner-reject@example.test', 'owner',
            ${hashToken(rawToken())}, ${profileAcme}::uuid, 'pending', now() + interval '1 day'
          )
        `),
      ).rejects.toThrow();
    });
  },
);
