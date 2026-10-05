import { and, count, eq } from "drizzle-orm";
import { getDb, leads, withTenantContext } from "@auto-platform/db";
import type { MembershipSession } from "@/lib/auth/require-membership";

export { formatNewLeadsBadge, type NewLeadsBadgeView } from "./new-leads-badge";

/**
 * Counts leads with status `new` for the Host tenant (dashboard badge).
 * Never call from public storefront.
 */
export async function countNewLeadsForTenant(
  session: MembershipSession,
): Promise<number> {
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const total = await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    const [row] = await db
      .select({ value: count() })
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.status, "new")));
    return Number(row?.value ?? 0);
  });

  return Number.isFinite(total) && total > 0 ? total : 0;
}
