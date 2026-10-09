"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDb, tenantInvitations, withTenantContext, writeAuditLog } from "@auto-platform/db";
import { invitationIdInputSchema, INVITE_TOKEN_TTL_MS } from "@auto-platform/types";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import {
  getTrustedClientIp,
  hashClientIpForRateLimit,
} from "@/lib/leads/trusted-client-ip";
import { notifyTenantInvitation } from "@/lib/team/invite-notify";
import {
  getInviteRateLimitBackend,
  INVITE_RESEND_ENDPOINT,
} from "@/lib/team/invite-rate-limit";
import { generateInviteToken, hashInviteToken } from "@/lib/team/invite-token";
import {
  TEAM_NEUTRAL_ERROR,
  TEAM_NEUTRAL_RATE,
  type TeamActionState,
} from "@/lib/team/team-action-state";

export async function resendTenantInvitationAction(
  _prev: TeamActionState | null,
  formData: FormData,
): Promise<TeamActionState> {
  let session;
  try {
    session = await requireSettingsOwner();
  } catch {
    return { error: TEAM_NEUTRAL_ERROR, success: false };
  }

  if (session.tenant.status !== "active") {
    return { error: TEAM_NEUTRAL_ERROR, success: false };
  }

  const headerStore = await headers();
  const clientIp = getTrustedClientIp((name) => headerStore.get(name));
  const ipHash = clientIp ? hashClientIpForRateLimit(clientIp) : "unknown";
  const rateLimit = getInviteRateLimitBackend();
  const scope = {
    tenantId: session.tenant.tenantId,
    ipHash,
    endpoint: INVITE_RESEND_ENDPOINT,
  } as const;

  const attempt = rateLimit.checkAttempt(scope);
  if (!attempt.allowed) {
    return { error: TEAM_NEUTRAL_RATE, success: false, rateLimited: true };
  }
  rateLimit.recordAttempt(scope);

  const parsed = invitationIdInputSchema.safeParse({
    invitationId: formData.get("invitationId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: TEAM_NEUTRAL_ERROR, success: false };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  try {
    const result = await withTenantContext(
      getDb(),
      { profileId, tenantId },
      async (db) => {
        const [existing] = await db
          .select({
            id: tenantInvitations.id,
            tenantId: tenantInvitations.tenantId,
            email: tenantInvitations.email,
            role: tenantInvitations.role,
            status: tenantInvitations.status,
          })
          .from(tenantInvitations)
          .where(
            and(
              eq(tenantInvitations.id, parsed.data.invitationId),
              eq(tenantInvitations.tenantId, tenantId),
            ),
          )
          .limit(1);

        if (!existing || existing.tenantId !== tenantId) {
          throw new Error("not_found");
        }
        if (existing.status === "accepted") {
          throw new Error("already_accepted");
        }
        if (existing.status !== "pending" && existing.status !== "expired") {
          throw new Error("not_resendable");
        }

        // Revoke old pending (invalidates previous token), then insert fresh pending.
        if (existing.status === "pending") {
          await db
            .update(tenantInvitations)
            .set({
              status: "revoked",
              revokedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(tenantInvitations.id, existing.id),
                eq(tenantInvitations.tenantId, tenantId),
                eq(tenantInvitations.status, "pending"),
              ),
            );
        }

        const rawToken = generateInviteToken();
        const tokenHash = hashInviteToken(rawToken);
        const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

        const [row] = await db
          .insert(tenantInvitations)
          .values({
            tenantId,
            email: existing.email,
            role: existing.role,
            tokenHash,
            invitedByProfileId: profileId,
            status: "pending",
            expiresAt,
          })
          .returning({ id: tenantInvitations.id, tenantId: tenantInvitations.tenantId });

        if (!row?.id || row.tenantId !== tenantId) {
          throw new Error("insert_failed");
        }

        await writeAuditLog(db, {
          tenantId,
          actorProfileId: profileId,
          action: "invitation_resent",
          entityType: "tenant_invitation",
          entityId: row.id,
          metadata: { role: existing.role },
        });

        void rawToken;

        return { invitationId: row.id, role: existing.role };
      },
    );

    notifyTenantInvitation({
      tenantId,
      invitationId: result.invitationId,
      role: result.role,
      hasEmail: true,
    });

    rateLimit.recordAccept(scope);
    revalidatePath("/dashboard/settings/team");
    return { error: null, success: true };
  } catch {
    return { error: TEAM_NEUTRAL_ERROR, success: false };
  }
}
