import { eq } from "drizzle-orm";
import { getDb, tenants, withTenantContext } from "@auto-platform/db";
import { parsePublicBranding, type PublicBrandingFields } from "@/lib/storefront/public-dto";
import { parseLeadNotificationEmails } from "@/lib/tenant/parse-lead-notification-emails";
import type { MembershipSession } from "@/lib/auth/require-membership";

/** Dashboard settings view — includes staff-only notification recipients. */
export type StaffBrandingSettings = PublicBrandingFields & {
  leadNotificationEmails: string[];
};

/** Loads whitelist-parsed branding for the Host tenant (dashboard settings). */
export async function getTenantBrandingForSettings(
  session: MembershipSession,
): Promise<StaffBrandingSettings> {
  const { tenant, user } = session;
  const row = await withTenantContext(
    getDb(),
    { profileId: user.profile.id, tenantId: tenant.tenantId },
    async (db) => {
      return db.query.tenants.findFirst({
        where: eq(tenants.id, tenant.tenantId),
        columns: { branding: true },
      });
    },
  );
  const publicFields = parsePublicBranding(row?.branding);
  return {
    ...publicFields,
    leadNotificationEmails: parseLeadNotificationEmails(row?.branding),
  };
}
