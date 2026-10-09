"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, tenantInvitations, withTenantContext, writeAuditLog } from "@auto-platform/db";
import { invitationIdInputSchema } from "@auto-platform/types";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import {
  TEAM_NEUTRAL_ERROR,
  type TeamActionState,
} from "@/lib/team/team-action-state";

export async function revokeTenantInvitationAction(
  _prev: TeamActionState | null,
  formData: FormData,
): Promise<TeamActionState> {
  let session;
  try {
    session = await requireSettingsOwner();
  } catch {
    return { error: TEAM_NEUTRAL_ERROR, success: false };
  }

  const parsed = invitationIdInputSchema.safeParse({
    invitationId: formData.get("invitationId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: TEAM_NEUTRAL_ERROR, success: false };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const [updated] = await db
        .update(tenantInvitations)
        .set({
          status: "revoked",
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tenantInvitations.id, parsed.data.invitationId),
            eq(tenantInvitations.tenantId, tenantId),
            eq(tenantInvitations.status, "pending"),
          ),
        )
        .returning({
          id: tenantInvitations.id,
          tenantId: tenantInvitations.tenantId,
        });

      if (!updated || updated.tenantId !== tenantId) {
        throw new Error("not_found");
      }

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "invitation_revoked",
        entityType: "tenant_invitation",
        entityId: updated.id,
        metadata: {},
      });
    });

    revalidatePath("/dashboard/settings/team");
    return { error: null, success: true };
  } catch {
    return { error: TEAM_NEUTRAL_ERROR, success: false };
  }
}
