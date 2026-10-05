/**
 * Best-effort email notifier for new public leads.
 * No live provider is wired in v1 — use NoopLeadEmailNotifier unless env opts in.
 *
 * Production env (document only; not required for local):
 * - LEAD_EMAIL_PROVIDER=noop | log  (default: noop)
 * - Future: RESEND_API_KEY + approved SDK — not installed in this repo yet.
 *
 * Never log PII (name, email, phone, message, recipient addresses).
 */

export type LeadEmailNotifyInput = {
  tenantId: string;
  leadId: string;
  /** Relative dashboard path, e.g. /dashboard/leads/<uuid> */
  dashboardLeadPath: string;
  /** Already validated recipient list (max 3). */
  recipients: string[];
  /** Optional contact — only for authorized transport implementations; never logged. */
  lead?: {
    name: string;
    email?: string;
    phone?: string;
    message?: string;
  };
};

export type LeadEmailNotifyResult = {
  attempted: boolean;
  sent: boolean;
  reason?: "no_recipients" | "not_configured" | "provider_error" | "ok";
};

export interface LeadEmailNotifier {
  notifyNewLead(input: LeadEmailNotifyInput): Promise<LeadEmailNotifyResult>;
}

/** Explicit no-op — documents that email is not delivered. */
export class NoopLeadEmailNotifier implements LeadEmailNotifier {
  async notifyNewLead(input: LeadEmailNotifyInput): Promise<LeadEmailNotifyResult> {
    if (input.recipients.length === 0) {
      return { attempted: false, sent: false, reason: "no_recipients" };
    }
    return { attempted: true, sent: false, reason: "not_configured" };
  }
}

/**
 * Dev-safe logger: tenantId + leadId + recipientCount + outcome only.
 * Does not print addresses or lead PII.
 */
export class LogSafeLeadEmailNotifier implements LeadEmailNotifier {
  async notifyNewLead(input: LeadEmailNotifyInput): Promise<LeadEmailNotifyResult> {
    if (input.recipients.length === 0) {
      return { attempted: false, sent: false, reason: "no_recipients" };
    }
    // Intentionally log-safe: tenant/lead ids + recipientCount only (no PII).
    console.info("[lead-email:noop]", {
      tenantId: input.tenantId,
      leadId: input.leadId,
      recipientCount: input.recipients.length,
      outcome: "not_configured",
    });
    return { attempted: true, sent: false, reason: "not_configured" };
  }
}

let notifierSingleton: LeadEmailNotifier | null = null;

export function createLeadEmailNotifierFromEnv(): LeadEmailNotifier {
  const mode = (process.env.LEAD_EMAIL_PROVIDER ?? "noop").trim().toLowerCase();
  if (mode === "log") {
    return new LogSafeLeadEmailNotifier();
  }
  return new NoopLeadEmailNotifier();
}

export function getLeadEmailNotifier(): LeadEmailNotifier {
  if (!notifierSingleton) {
    notifierSingleton = createLeadEmailNotifierFromEnv();
  }
  return notifierSingleton;
}

/** Test seam */
export function setLeadEmailNotifierForTests(notifier: LeadEmailNotifier | null): void {
  notifierSingleton = notifier;
}

/**
 * Best-effort wrapper: never throws to callers.
 */
export async function notifyNewLeadBestEffort(
  input: LeadEmailNotifyInput,
  notifier: LeadEmailNotifier = getLeadEmailNotifier(),
): Promise<LeadEmailNotifyResult> {
  if (input.recipients.length === 0) {
    return { attempted: false, sent: false, reason: "no_recipients" };
  }
  try {
    return await notifier.notifyNewLead(input);
  } catch {
    return { attempted: true, sent: false, reason: "provider_error" };
  }
}

/**
 * Called only after a successful public lead insert.
 * Skips notifier when there are no configured recipients.
 */
export async function maybeNotifyAfterPublicLeadInsert(args: {
  tenantId: string;
  leadId: string;
  recipients: string[];
  lead: {
    name: string;
    email?: string;
    phone?: string;
    message?: string;
  };
  notifier?: LeadEmailNotifier;
}): Promise<LeadEmailNotifyResult> {
  if (!args.leadId || args.recipients.length === 0) {
    return { attempted: false, sent: false, reason: "no_recipients" };
  }
  return notifyNewLeadBestEffort(
    {
      tenantId: args.tenantId,
      leadId: args.leadId,
      dashboardLeadPath: `/dashboard/leads/${args.leadId}`,
      recipients: args.recipients,
      lead: args.lead,
    },
    args.notifier,
  );
}

/** Pure helper for email body construction (used by future providers + tests). */
export function buildNewLeadEmailSubject(): string {
  return "Lead nou pe site";
}

export function buildNewLeadEmailTextBody(dashboardLeadPath: string): string {
  return [
    "Ai primit un lead nou pe site-ul dealerului.",
    "",
    `Deschide în dashboard: ${dashboardLeadPath}`,
    "",
    "Acest mesaj este generat automat.",
  ].join("\n");
}
