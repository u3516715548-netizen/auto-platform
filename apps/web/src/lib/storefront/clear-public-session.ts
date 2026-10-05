import { sql } from "drizzle-orm";
import type { getDb } from "@auto-platform/db";

type Db = ReturnType<typeof getDb>;

/**
 * Clears staff session GUCs so public RLS policies apply
 * (`app.current_profile_id()` IS NULL).
 */
export async function clearPublicSessionGucs(db: Db) {
  await db.execute(sql`select set_config('app.profile_id', '', true)`);
  await db.execute(sql`select set_config('app.tenant_id', '', true)`);
}
