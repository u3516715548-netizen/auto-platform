/**
 * Tenant session helpers for defense-in-depth with PostgreSQL RLS.
 *
 * App code MUST call withTenantContext (or setTenantSession) before business queries.
 * Never trust tenant_id from the client — pass verified membership values only.
 *
 * GUC keys used by SQL policies in drizzle/*_rls.sql:
 * - app.profile_id
 * - app.tenant_id
 */

import { sql } from "drizzle-orm";
import type { Database } from "./client";

export type TenantSession = {
  profileId: string;
  tenantId: string;
};

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantContextError";
  }
}

export async function setTenantSession(db: Database, session: TenantSession) {
  if (!session.profileId || !session.tenantId) {
    throw new TenantContextError("profileId and tenantId are required");
  }

  // SET LOCAL is transaction-scoped; when not in an explicit transaction it still
  // applies for the current session statement batch on postgres.js.
  await db.execute(sql`select set_config('app.profile_id', ${session.profileId}, true)`);
  await db.execute(sql`select set_config('app.tenant_id', ${session.tenantId}, true)`);
}

export async function clearTenantSession(db: Database) {
  await db.execute(sql`select set_config('app.profile_id', '', true)`);
  await db.execute(sql`select set_config('app.tenant_id', '', true)`);
}

/**
 * Runs `fn` with RLS session GUCs set. Does not accept arbitrary client tenant ids —
 * caller must have already verified membership.
 */
export async function withTenantContext<T>(
  db: Database,
  session: TenantSession,
  fn: (db: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await setTenantSession(tx as unknown as Database, session);
    return fn(tx as unknown as Database);
  });
}

/**
 * Assert helper for server code: entity.tenantId must equal the active tenant.
 * Complements RLS — never skip this in application logic.
 */
export function assertSameTenant(expectedTenantId: string, actualTenantId: string) {
  if (expectedTenantId !== actualTenantId) {
    throw new TenantContextError("Cross-tenant access denied");
  }
}
