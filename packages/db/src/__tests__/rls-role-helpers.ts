/**
 * Real RLS test helpers — SET LOCAL ROLE to anon|authenticated (no BYPASSRLS).
 * Always rolls back so fixture data is never left behind.
 *
 * Never log UUIDs, connection strings, or secrets.
 */

import { sql } from "drizzle-orm";
import type { Database } from "../client";

export type RlsDbRole = "anon" | "authenticated";

export type RlsTenantGucs = {
  profileId: string;
  tenantId: string;
};

/** Thrown after assertions to force transaction rollback. */
export class IntentionalRlsRollback extends Error {
  constructor() {
    super("intentional_rls_test_rollback");
    this.name = "IntentionalRlsRollback";
  }
}

function isIntentionalRollback(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: string }).name;
  const message = String((error as { message?: string }).message ?? "");
  return name === "IntentionalRlsRollback" || message.includes("intentional_rls_test_rollback");
}

type RoleProbe = {
  usr: string;
  bypass: boolean;
};

/**
 * Clears app.* GUCs so public policies see `current_profile_id() IS NULL`.
 */
export async function clearRlsGucs(tx: Database): Promise<void> {
  await tx.execute(sql`select set_config('app.profile_id', '', true)`);
  await tx.execute(sql`select set_config('app.tenant_id', '', true)`);
}

/**
 * Sets membership session GUCs used by app.has_tenant_access / has_tenant_role.
 */
export async function setRlsGucs(tx: Database, gucs: RlsTenantGucs): Promise<void> {
  if (!gucs.profileId || !gucs.tenantId) {
    throw new Error("rls-helpers: profileId and tenantId are required");
  }
  await tx.execute(sql`select set_config('app.profile_id', ${gucs.profileId}, true)`);
  await tx.execute(sql`select set_config('app.tenant_id', ${gucs.tenantId}, true)`);
}

async function assertNonBypassRole(tx: Database, expected: RlsDbRole): Promise<void> {
  const rows = await tx.execute<RoleProbe>(sql`
    select current_user as usr,
           (select rolbypassrls from pg_roles where rolname = current_user) as bypass
  `);
  const list = Array.from(rows as unknown as RoleProbe[]);
  const row = list[0];
  if (!row) {
    throw new Error("rls-helpers: could not read current_user / rolbypassrls");
  }
  if (row.usr !== expected) {
    throw new Error(`rls-helpers: expected role ${expected}, got ${row.usr}`);
  }
  if (row.bypass === true || row.bypass === ("t" as unknown)) {
    throw new Error(
      `rls-helpers: role ${expected} still has rolbypassrls=true — aborting (not a real RLS test)`,
    );
  }
}

type WithRlsRoleOptions = {
  /** Session GUCs after SET ROLE. Omit / null → cleared (public / anon path). */
  gucs?: RlsTenantGucs | null;
  /**
   * Optional setup still running as the connection role (typically postgres).
   * Use only to create ephemeral rows that will roll back with the transaction.
   */
  setupAsOwner?: (tx: Database) => Promise<void>;
};

/**
 * Runs `fn` inside a transaction as `anon` or `authenticated`, then rolls back.
 * Fails hard if the session still has BYPASSRLS after SET LOCAL ROLE.
 */
export async function withRlsRole<T>(
  db: Database,
  role: RlsDbRole,
  fn: (tx: Database) => Promise<T>,
  options?: WithRlsRoleOptions,
): Promise<T> {
  if (role !== "anon" && role !== "authenticated") {
    throw new Error("rls-helpers: role must be anon or authenticated");
  }

  let result!: T;
  try {
    await db.transaction(async (tx) => {
      const scoped = tx as unknown as Database;

      if (options?.setupAsOwner) {
        await options.setupAsOwner(scoped);
      }

      // role is allowlisted above — safe for SET LOCAL ROLE.
      await scoped.execute(sql.raw(`set local role ${role}`));
      await assertNonBypassRole(scoped, role);

      if (options?.gucs) {
        await setRlsGucs(scoped, options.gucs);
      } else {
        await clearRlsGucs(scoped);
      }

      // SAVEPOINT: statement failures (RLS denials) abort only the subxact.
      // Always ROLLBACK TO SAVEPOINT after fn — including when vitest expect().rejects
      // swallowed the JS error but Postgres still needs subxact recovery.
      await scoped.execute(sql.raw("savepoint rls_test_sp"));
      try {
        result = await fn(scoped);
      } catch (inner) {
        await scoped.execute(sql.raw("rollback to savepoint rls_test_sp"));
        throw inner;
      }
      await scoped.execute(sql.raw("rollback to savepoint rls_test_sp"));
      throw new IntentionalRlsRollback();
    });
  } catch (error) {
    if (isIntentionalRollback(error)) {
      return result;
    }
    throw error;
  }

  throw new Error("rls-helpers: transaction ended without rollback sentinel");
}

/** True when an error looks like a Postgres RLS / privilege rejection. */
export function isRlsOrPrivilegeDenial(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? error ?? "").toLowerCase();
  return (
    message.includes("row-level security") ||
    message.includes("violates row-level security") ||
    message.includes("permission denied") ||
    message.includes("new row violates") ||
    message.includes("policy")
  );
}
