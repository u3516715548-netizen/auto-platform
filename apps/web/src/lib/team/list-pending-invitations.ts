import { and, eq } from "drizzle-orm";
import { getDb, tenantInvitations, withTenantContext } from "@auto-platform/db";
import type { InvitableMembershipRole, TenantInvitationStatus } from "@auto-platform/types";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import { membershipRoleLabel } from "@/lib/dashboard/role-label";

export type PendingInvitationRow = {
  invitationId: string;
  email: string;
  role: InvitableMembershipRole;
  roleLabel: string;
  status: TenantInvitationStatus;
  expiresAt: string;
  createdAt: string;
};

export async function listPendingInvitations(): Promise<PendingInvitationRow[]> {
  const session = await requireSettingsOwner();
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  return withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    const rows = await db
      .select({
        id: tenantInvitations.id,
        tenantId: tenantInvitations.tenantId,
        email: tenantInvitations.email,
        role: tenantInvitations.role,
        status: tenantInvitations.status,
        expiresAt: tenantInvitations.expiresAt,
        createdAt: tenantInvitations.createdAt,
      })
      .from(tenantInvitations)
      .where(
        and(eq(tenantInvitations.tenantId, tenantId), eq(tenantInvitations.status, "pending")),
      );

    return rows
      .filter((row) => row.tenantId === tenantId)
      .map((row) => {
        const role = row.role as InvitableMembershipRole;
        return {
          invitationId: row.id,
          email: row.email,
          role,
          roleLabel: membershipRoleLabel(role),
          status: row.status,
          expiresAt: row.expiresAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
        };
      })
      .sort((a, b) => a.email.localeCompare(b.email, "ro"));
  });
}
