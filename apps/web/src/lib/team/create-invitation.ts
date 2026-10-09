"use server";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  getDb,
  tenantInvitations,
  withTenantContext,
  writeAuditLog,
} from "@auto-platform/db";
import {
  createTenantInvitationInputSchema,
  INVITE_TOKEN_TTL_MS,
} from "@auto-platform/types";
import { requireSettingsOwner } from "@/lib/auth/require-settings-owner";
import {
  getTrustedClientIp,
  hashClientIpForRateLimit,
} from "@/lib/leads/trusted-client-ip";
import { notifyTenantInvitation } from "@/lib/team/invite-notify";
import {
  getInviteRateLimitBackend,
  INVITE_CREATE_ENDPOINT,
} from "@/lib/team/invite-rate-limit";
import { generateInviteToken, hashInviteToken } from "@/lib/team/invite-token";
import {
  TEAM_NEUTRAL_ERROR,
  TEAM_NEUTRAL_EXISTS,
  TEAM_NEUTRAL_RATE,
  type TeamActionState,
} from "@/lib/team/team-action-state";

export type { TeamActionState };

export async function createTenantInvitationAction(
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
    endpoint: INVITE_CREATE_ENDPOINT,
  } as const;

  const attempt = rateLimit.checkAttempt(scope);
  if (!attempt.allowed) {
    return { error: TEAM_NEUTRAL_RATE, success: false, rateLimited: true };
  }
  rateLimit.recordAttempt(scope);

  const parsed = createTenantInvitationInputSchema.safeParse({
    email: formData.get("email") ?? undefined,
    role: formData.get("role") ?? undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? TEAM_NEUTRAL_ERROR,
      success: false,
    };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;
  const email = parsed.data.email;
  const role = parsed.data.role;

  try {
    const invitationId = await withTenantContext(
      getDb(),
      { profileId, tenantId },
      async (db) => {
        const memberCheck = await db.execute<{ exists: boolean }>(sql`
          select app.tenant_member_email_exists(${tenantId}::uuid, ${email}) as exists
        `);
        const memberRows = Array.from(memberCheck as unknown as Array<{ exists: boolean }>);
        if (memberRows[0]?.exists === true || memberRows[0]?.exists === ("t" as unknown)) {
          throw new Error("member_exists");
        }

        await db
          .update(tenantInvitations)
          .set({
            status: "revoked",
            revokedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(tenantInvitations.tenantId, tenantId),
              eq(tenantInvitations.email, email),
              eq(tenantInvitations.status, "pending"),
            ),
          );

        const rawToken = generateInviteToken();
        const tokenHash = hashInviteToken(rawToken);
        const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

        const [row] = await db
          .insert(tenantInvitations)
          .values({
            tenantId,
            email,
            role,
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
          action: "invitation_created",
          entityType: "tenant_invitation",
          entityId: row.id,
          metadata: { role },
        });

        // Raw token is intentionally not returned and not logged (noop/log notifier).
        void rawToken;

        return row.id;
      },
    );

    notifyTenantInvitation({
      tenantId,
      invitationId,
      role,
      hasEmail: true,
    });

    rateLimit.recordAccept(scope);
    revalidatePath("/dashboard/settings/team");
    return { error: null, success: true };
  } catch (error) {
    const message = String((error as { message?: string })?.message ?? "");
    if (message.includes("member_exists") || message.includes("unique")) {
      return { error: TEAM_NEUTRAL_EXISTS, success: false };
    }
    return { error: TEAM_NEUTRAL_ERROR, success: false };
  }
}
