/**
 * Staff-only parse of lead notification recipient emails from tenants.branding.
 * Never feed this into PublicTenantView / public DTO.
 */

import { leadNotificationEmailsSchema } from "@auto-platform/types";

export function parseLeadNotificationEmails(branding: unknown): string[] {
  if (!branding || typeof branding !== "object" || Array.isArray(branding)) {
    return [];
  }
  const raw = (branding as Record<string, unknown>).leadNotificationEmails;
  const parsed = leadNotificationEmailsSchema.safeParse(raw ?? []);
  return parsed.success ? parsed.data : [];
}
