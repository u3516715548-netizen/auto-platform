import type { LeadNotificationStatus } from "@auto-platform/types";
import type { LeadEmailNotifyResult } from "@/lib/notifications/lead-email";

export type LeadNotificationPersistence = {
  notificationStatus: Exclude<LeadNotificationStatus, "pending" | "skipped" | "sent">;
  notificationAttemptedAt: Date;
  notificationReason: string;
};

/**
 * Maps notifier outcome to DB columns for Etapa 17 (noop/log only).
 * Never persists `sent` — real delivery is out of scope.
 * `notificationReason` is a short internal code only (no PII).
 */
export function mapLeadNotifyResultToPersistence(
  result: LeadEmailNotifyResult,
  attemptedAt: Date = new Date(),
): LeadNotificationPersistence {
  if (result.reason === "no_recipients") {
    return {
      notificationStatus: "no_recipients",
      notificationAttemptedAt: attemptedAt,
      notificationReason: "no_recipients",
    };
  }

  if (result.reason === "provider_error") {
    return {
      notificationStatus: "failed",
      notificationAttemptedAt: attemptedAt,
      notificationReason: "provider_error",
    };
  }

  // noop / log / not_configured — and any accidental `sent` from a future provider
  return {
    notificationStatus: "not_configured",
    notificationAttemptedAt: attemptedAt,
    notificationReason: "not_configured",
  };
}
