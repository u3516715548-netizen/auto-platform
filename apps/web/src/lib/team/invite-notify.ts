/**
 * Best-effort invite notifier — noop/log only (Etapa 17 pattern).
 * Never logs raw tokens, token hashes, or full invitation secrets.
 */

export type InviteNotifyInput = {
  tenantId: string;
  invitationId: string;
  role: string;
  /** Count only — never log the address. */
  hasEmail: boolean;
};

export type InviteNotifyResult = {
  attempted: boolean;
  delivered: boolean;
  reason: "noop" | "logged" | "error";
};

export function notifyTenantInvitation(input: InviteNotifyInput): InviteNotifyResult {
  const mode = (process.env.LEAD_EMAIL_PROVIDER ?? "noop").trim().toLowerCase();
  try {
    if (mode === "log") {
      console.info("[team-invite:noop]", {
        tenantId: input.tenantId,
        invitationId: input.invitationId,
        role: input.role,
        hasEmail: input.hasEmail,
        outcome: "not_configured",
      });
      return { attempted: true, delivered: false, reason: "logged" };
    }
    return { attempted: true, delivered: false, reason: "noop" };
  } catch {
    return { attempted: true, delivered: false, reason: "error" };
  }
}
