import { eq } from "drizzle-orm";
import { getDb, tenantSeoSettings, withTenantContext } from "@auto-platform/db";
import type { MembershipSession } from "@/lib/auth/require-membership";

export type SeoSettingsForForm = {
  seoTitleDefault: string;
  seoDescriptionDefault: string;
  faviconPath: string;
  indexingEnabled: boolean;
};

export async function getSeoSettingsForSettings(
  session: MembershipSession,
): Promise<SeoSettingsForForm> {
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const row = await withTenantContext(
    getDb(),
    { profileId, tenantId },
    async (db) =>
      db.query.tenantSeoSettings.findFirst({
        where: eq(tenantSeoSettings.tenantId, tenantId),
      }),
  );

  return {
    seoTitleDefault: row?.seoTitleDefault ?? "",
    seoDescriptionDefault: row?.seoDescriptionDefault ?? "",
    faviconPath: row?.faviconPath ?? "",
    indexingEnabled: row?.indexingEnabled ?? true,
  };
}
