import { and, eq } from "drizzle-orm";
import {
  MembershipRequiredError,
  type MembershipContext,
} from "@auto-platform/core";
import { getDb, memberships } from "@auto-platform/db";
import { requireCurrentUser } from "./get-current-user";
import { requireCurrentTenant, type CurrentTenant } from "@/lib/tenant/get-current-tenant";

export type MembershipSession = {
  user: Awaited<ReturnType<typeof requireCurrentUser>>;
  tenant: CurrentTenant;
  membership: MembershipContext;
};

/**
 * Requires authenticated user with a profile and an active membership
 * on the tenant resolved from Host (never from client tenant_id).
 */
export async function requireMembership(): Promise<MembershipSession> {
  const user = await requireCurrentUser();
  const tenant = await requireCurrentTenant();
  const membership = await loadMembership(user.profile.id, tenant.tenantId);

  if (!membership) {
    throw new MembershipRequiredError();
  }

  return { user, tenant, membership };
}

export async function loadMembership(
  profileId: string,
  tenantId: string,
): Promise<MembershipContext | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.profileId, profileId), eq(memberships.tenantId, tenantId)))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    membershipId: row.id,
    profileId: row.profileId,
    tenantId: row.tenantId,
    role: row.role,
  };
}
