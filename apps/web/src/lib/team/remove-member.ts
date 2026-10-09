"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, memberships, withTenantContext, writeAuditLog } from "@auto-platform/db";
import { removeMemberInputSchema } from "@auto-platform/types";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import {
  TEAM_LAST_OWNER_ERROR,
  TEAM_NEUTRAL_ERROR,
  type TeamActionState,
} from "@/lib/team/team-action-state";

export async function removeMemberAction(
  _prev: TeamActionState | null,
  formData: FormData,
): Promise<TeamActionState> {
  let session;
  try {
    session = await requireSettingsOwner();
  } catch {
    return { error: TEAM_NEUTRAL_ERROR, success: false };
  }

  const parsed = removeMemberInputSchema.safeParse({
    membershipId: formData.get("membershipId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: TEAM_NEUTRAL_ERROR, success: false };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const [target] = await db
        .select({
          id: memberships.id,
          tenantId: memberships.tenantId,
          profileId: memberships.profileId,
          role: memberships.role,
        })
        .from(memberships)
        .where(
          and(
            eq(memberships.id, parsed.data.membershipId),
            eq(memberships.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!target || target.tenantId !== tenantId) {
        throw new Error("not_found");
      }

      if (target.role === "owner") {
        const ownerCountRows = await db.execute<{ count: string }>(sql`
          select count(*)::text as count
          from memberships
          where tenant_id = ${tenantId}::uuid and role = 'owner'
        `);
        const countList = Array.from(ownerCountRows as unknown as Array<{ count: string }>);
        const ownerCount = Number(countList[0]?.count ?? "0");
        if (ownerCount <= 1) {
          throw new Error("last_owner");
        }
      }

      const deleted = await db
        .delete(memberships)
        .where(and(eq(memberships.id, target.id), eq(memberships.tenantId, tenantId)))
        .returning({ id: memberships.id, tenantId: memberships.tenantId });

      if (!deleted[0] || deleted[0].tenantId !== tenantId) {
        throw new Error("delete_failed");
      }

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "member_removed",
        entityType: "membership",
        entityId: deleted[0].id,
        metadata: { role: target.role },
      });
    });

    revalidatePath("/dashboard/settings/team");
    revalidatePath("/dashboard", "layout");
    return { error: null, success: true };
  } catch (error) {
    const message = String((error as { message?: string })?.message ?? "");
    if (message.includes("last_owner")) {
      return { error: TEAM_LAST_OWNER_ERROR, success: false };
    }
    return { error: TEAM_NEUTRAL_ERROR, success: false };
  }
}
