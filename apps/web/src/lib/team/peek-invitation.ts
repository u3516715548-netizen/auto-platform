import { sql } from "drizzle-orm";
import { getDb } from "@auto-platform/db";
import type { InvitableMembershipRole } from "@auto-platform/types";
import { hashInviteToken, parseInviteTokenParam } from "@/lib/team/invite-token";

export type PeekInvitationOutcome =
  | "pending"
  | "invalid"
  | "expired"
  | "revoked"
  | "accepted";

export type PeekInvitationResult = {
  outcome: PeekInvitationOutcome;
  tenantName: string | null;
  role: InvitableMembershipRole | null;
  /** Invited email — only when outcome is pending (for signup lock). */
  email: string | null;
  expiresAt: string | null;
};

type PeekRow = {
  outcome: string;
  tenant_name: string | null;
  role: string | null;
  email: string | null;
  expires_at: Date | string | null;
};

/**
 * Safe peek by raw token. Never enumerates by email.
 * Does not return token, UUID, or tenant id.
 */
export async function peekTenantInvitation(
  rawToken: string | null | undefined,
): Promise<PeekInvitationResult> {
  const token = parseInviteTokenParam(rawToken);
  if (!token) {
    return {
      outcome: "invalid",
      tenantName: null,
      role: null,
      email: null,
      expiresAt: null,
    };
  }

  const tokenHash = hashInviteToken(token);
  const db = getDb();

  try {
    const rows = await db.execute<PeekRow>(sql`
      select * from app.peek_tenant_invitation(${tokenHash})
    `);
    const list = Array.from(rows as unknown as PeekRow[]);
    const row = list[0];
    if (!row) {
      return {
        outcome: "invalid",
        tenantName: null,
        role: null,
        email: null,
        expiresAt: null,
      };
    }

    const outcome = normalizeOutcome(row.outcome);
    if (outcome !== "pending") {
      return {
        outcome,
        tenantName: null,
        role: null,
        email: null,
        expiresAt: null,
      };
    }

    const role = row.role as InvitableMembershipRole | null;
    if (!role || !["manager", "sales", "viewer"].includes(role)) {
      return {
        outcome: "invalid",
        tenantName: null,
        role: null,
        email: null,
        expiresAt: null,
      };
    }

    return {
      outcome: "pending",
      tenantName: row.tenant_name,
      role,
      email: row.email,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    };
  } catch {
    return {
      outcome: "invalid",
      tenantName: null,
      role: null,
      email: null,
      expiresAt: null,
    };
  }
}

function normalizeOutcome(raw: string | null | undefined): PeekInvitationOutcome {
  switch (raw) {
    case "pending":
    case "invalid":
    case "expired":
    case "revoked":
    case "accepted":
      return raw;
    default:
      return "invalid";
  }
}
