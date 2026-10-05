import { and, eq, inArray } from "drizzle-orm";
import { LEAD_ASSIGNABLE_ROLES, type MembershipRole } from "@auto-platform/core";
import { getDb, memberships, profiles, withTenantContext } from "@auto-platform/db";
import { requireMembership } from "@/lib/auth/require-membership";
import { membershipRoleLabel } from "@/lib/dashboard/role-label";

export type LeadAssigneeOption = {
  profileId: string;
  displayName: string;
  role: MembershipRole;
};

/**
 * Eligible assignees: active memberships with owner/manager/sales on current tenant.
 * Profile names may be missing under strict `profiles_select_own` RLS — fallback to role label.
 */
export async function listLeadAssignableMembers(): Promise<LeadAssigneeOption[]> {
  const { user, tenant } = await requireMembership();
  const tenantId = tenant.tenantId;
  const profileId = user.profile.id;

  return withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    const rows = await db
      .select({
        profileId: memberships.profileId,
        role: memberships.role,
        name: profiles.name,
        membershipTenantId: memberships.tenantId,
      })
      .from(memberships)
      .leftJoin(profiles, eq(profiles.id, memberships.profileId))
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          inArray(memberships.role, [...LEAD_ASSIGNABLE_ROLES]),
        ),
      );

    return rows
      .filter((row) => row.membershipTenantId === tenantId)
      .map((row) => {
        const role = row.role as MembershipRole;
        const name = row.name?.trim();
        return {
          profileId: row.profileId,
          role,
          displayName: name || `Membru · ${membershipRoleLabel(role)}`,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "ro"));
  });
}
