import { eq } from "drizzle-orm";
import type { MembershipRole } from "@auto-platform/core";
import { getDb, memberships, profiles, withTenantContext } from "@auto-platform/db";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { membershipRoleLabel } from "@/lib/dashboard/role-label";

export type TeamMemberRow = {
  membershipId: string;
  profileId: string;
  role: MembershipRole;
  roleLabel: string;
  displayName: string;
  /** Present only when RLS allows reading the profile row (typically self). */
  email: string | null;
  createdAt: string;
  isSelf: boolean;
};

/**
 * Lists memberships for the Host tenant. Profile name/email follow `profiles_select_own`
 * RLS — other members may show a role-based fallback name and no email.
 */
export async function listTeamMembers(): Promise<TeamMemberRow[]> {
  const session = await requireSettingsOwner();
  const tenantId = session.tenant.tenantId;
  const selfId = session.user.profile.id;

  return withTenantContext(
    getDb(),
    { profileId: selfId, tenantId },
    async (db) => {
      const rows = await db
        .select({
          membershipId: memberships.id,
          profileId: memberships.profileId,
          role: memberships.role,
          createdAt: memberships.createdAt,
          membershipTenantId: memberships.tenantId,
          name: profiles.name,
          email: profiles.email,
        })
        .from(memberships)
        .leftJoin(profiles, eq(profiles.id, memberships.profileId))
        .where(eq(memberships.tenantId, tenantId));

      return rows
        .filter((row) => row.membershipTenantId === tenantId)
        .map((row) => {
          const role = row.role as MembershipRole;
          const name = row.name?.trim();
          const isSelf = row.profileId === selfId;
          return {
            membershipId: row.membershipId,
            profileId: row.profileId,
            role,
            roleLabel: membershipRoleLabel(role),
            displayName: name || `Membru · ${membershipRoleLabel(role)}`,
            email: row.email?.trim() || null,
            createdAt: row.createdAt.toISOString(),
            isSelf,
          };
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName, "ro"));
    },
  );
}
