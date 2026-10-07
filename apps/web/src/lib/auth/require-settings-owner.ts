import { notFound } from "next/navigation";
import { canAccessSettingsOwnerSection } from "@/lib/dashboard/settings-nav";
import { requireMembership, type MembershipSession } from "@/lib/auth/require-membership";

/**
 * Settings admin pages (team / company / customization).
 * Non-owners get 404 — do not leak that the section exists with empty data.
 */
export async function requireSettingsOwner(): Promise<MembershipSession> {
  const session = await requireMembership();
  if (!canAccessSettingsOwnerSection(session.membership.role)) {
    notFound();
  }
  return session;
}
