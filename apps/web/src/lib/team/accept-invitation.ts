"use server";

import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, withTenantContext, writeAuditLog } from "@auto-platform/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  getTrustedClientIp,
  hashClientIpForRateLimit,
} from "@/lib/leads/trusted-client-ip";
import { ensureInviteProfile } from "@/lib/team/ensure-invite-profile";
import {
  getInviteRateLimitBackend,
  INVITE_ACCEPT_ENDPOINT,
} from "@/lib/team/invite-rate-limit";
import { hashInviteToken, parseInviteTokenParam } from "@/lib/team/invite-token";
import { peekTenantInvitation } from "@/lib/team/peek-invitation";
import {
  TEAM_NEUTRAL_ERROR,
  TEAM_NEUTRAL_RATE,
  type TeamActionState,
} from "@/lib/team/team-action-state";
import { dashboardPath } from "@/lib/auth/auth-redirects";

export type AcceptInvitationState = TeamActionState & {
  outcome?:
    | "ok"
    | "invalid"
    | "expired"
    | "revoked"
    | "accepted"
    | "email_mismatch"
    | "login_required"
    | "signup_required"
    | "tenant_inactive";
};

/**
 * Accepts a pending invitation for the authenticated user.
 * Creates profile if missing (invite signup path), then calls SECURITY DEFINER helper.
 */
export async function acceptTenantInvitationAction(
  _prev: AcceptInvitationState | null,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const rawToken = String(formData.get("token") ?? "");
  const token = parseInviteTokenParam(rawToken);
  if (!token) {
    return { error: TEAM_NEUTRAL_ERROR, success: false, outcome: "invalid" };
  }

  const peek = await peekTenantInvitation(token);
  if (peek.outcome !== "pending" || !peek.email) {
    return {
      error: mapOutcomeMessage(peek.outcome),
      success: false,
      outcome: peek.outcome === "pending" ? "invalid" : peek.outcome,
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      error: "Autentificare necesară pentru a accepta invitația.",
      success: false,
      outcome: "login_required",
    };
  }

  const headerStore = await headers();
  const clientIp = getTrustedClientIp((name) => headerStore.get(name));
  const ipHash = clientIp ? hashClientIpForRateLimit(clientIp) : "unknown";
  // Tenant id unknown before accept — scope by placeholder + IP.
  const rateLimit = getInviteRateLimitBackend();
  const scope = {
    tenantId: "invite-accept",
    ipHash,
    endpoint: INVITE_ACCEPT_ENDPOINT,
  } as const;

  const attempt = rateLimit.checkAttempt(scope);
  if (!attempt.allowed) {
    return { error: TEAM_NEUTRAL_RATE, success: false, rateLimited: true };
  }
  rateLimit.recordAttempt(scope);

  const profileResult = await ensureInviteProfile({
    authUserId: user.authUserId,
    authEmail: user.email ?? user.profile?.email ?? null,
    invitedEmail: peek.email,
    displayName: user.profile?.name ?? null,
  });

  if ("error" in profileResult) {
    return {
      error:
        profileResult.error === "email_mismatch"
          ? "Emailul contului nu corespunde invitației."
          : TEAM_NEUTRAL_ERROR,
      success: false,
      outcome: profileResult.error === "email_mismatch" ? "email_mismatch" : "invalid",
    };
  }

  const tokenHash = hashInviteToken(token);
  const db = getDb();

  try {
    const rows = await db.execute<{ accept_tenant_invitation: string }>(sql`
      select app.accept_tenant_invitation(
        ${tokenHash},
        ${profileResult.profileId}::uuid,
        ${profileResult.email}
      ) as accept_tenant_invitation
    `);
    const list = Array.from(
      rows as unknown as Array<{ accept_tenant_invitation: string }>,
    );
    const code = list[0]?.accept_tenant_invitation ?? "invalid";

    if (code === "ok" || code === "already_member") {
      try {
        // Best-effort audit — tenant id resolved only after accept via membership is heavy;
        // log with empty metadata when we cannot resolve without leaking UUIDs to client.
        await writeAcceptAudit(profileResult.profileId);
      } catch {
        // ignore audit failure
      }
      rateLimit.recordAccept(scope);
      redirect(dashboardPath());
    }

    if (code === "email_mismatch") {
      return {
        error: "Emailul contului nu corespunde invitației.",
        success: false,
        outcome: "email_mismatch",
      };
    }
    if (code === "expired") {
      return { error: mapOutcomeMessage("expired"), success: false, outcome: "expired" };
    }
    if (code === "revoked") {
      return { error: mapOutcomeMessage("revoked"), success: false, outcome: "revoked" };
    }
    if (code === "accepted") {
      return { error: mapOutcomeMessage("accepted"), success: false, outcome: "accepted" };
    }
    if (code === "tenant_inactive") {
      return {
        error: "Organizația nu este disponibilă momentan.",
        success: false,
        outcome: "tenant_inactive",
      };
    }

    return { error: TEAM_NEUTRAL_ERROR, success: false, outcome: "invalid" };
  } catch (error) {
    // redirect() throws — rethrow
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { error: TEAM_NEUTRAL_ERROR, success: false, outcome: "invalid" };
  }
}

async function writeAcceptAudit(profileId: string): Promise<void> {
  const db = getDb();
  const rows = await db.execute<{ tenant_id: string }>(sql`
    select m.tenant_id
    from memberships m
    where m.profile_id = ${profileId}::uuid
    order by m.created_at desc
    limit 1
  `);
  const list = Array.from(rows as unknown as Array<{ tenant_id: string }>);
  const tenantId = list[0]?.tenant_id;
  if (!tenantId) return;

  await withTenantContext(db, { profileId, tenantId }, async (scoped) => {
    await writeAuditLog(scoped, {
      tenantId,
      actorProfileId: profileId,
      action: "invitation_accepted",
      entityType: "tenant_invitation",
      entityId: null,
      metadata: {},
    });
  });
}

function mapOutcomeMessage(
  outcome: "invalid" | "expired" | "revoked" | "accepted" | "pending",
): string {
  switch (outcome) {
    case "expired":
      return "Invitația a expirat.";
    case "revoked":
      return "Invitația nu mai este valabilă.";
    case "accepted":
      return "Invitația a fost deja folosită.";
    default:
      return TEAM_NEUTRAL_ERROR;
  }
}
