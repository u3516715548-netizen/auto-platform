import { eq } from "drizzle-orm";
import { getDb, tenants } from "@auto-platform/db";
import { clearPublicSessionGucs } from "@/lib/storefront/clear-public-session";
import { parseLeadNotificationEmails } from "@/lib/tenant/parse-lead-notification-emails";

/**
 * Loads staff-only notification recipients for a tenant under public (anon) DB context.
 * Does not return raw branding.
 */
export async function loadLeadNotificationEmailsForTenant(
  tenantId: string,
): Promise<string[]> {
  const db = getDb();
  await clearPublicSessionGucs(db);
  const [row] = await db
    .select({ branding: tenants.branding })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return parseLeadNotificationEmails(row?.branding);
}
