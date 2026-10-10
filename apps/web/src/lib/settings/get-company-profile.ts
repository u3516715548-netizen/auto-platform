import { eq } from "drizzle-orm";
import {
  getDb,
  tenantCompanyProfiles,
  withTenantContext,
} from "@auto-platform/db";
import type {
  BusinessHours,
  CompanyCurrency,
  CompanyEntityType,
  CompanyProfileView,
} from "@auto-platform/types";
import { businessHoursSchema } from "@auto-platform/types";
import type { MembershipSession } from "@/lib/auth/require-membership";

function parseBusinessHours(raw: unknown): BusinessHours | undefined {
  const parsed = businessHoursSchema.safeParse(raw ?? {});
  if (!parsed.success) return undefined;
  const hours = parsed.data;
  const hasDay = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].some(
    (day) => hours[day as keyof BusinessHours] != null,
  );
  if (!hasDay && !hours.note) return undefined;
  return hours;
}

/**
 * Loads the Host tenant company profile for the settings owner session.
 * Returns empty-friendly view when no row exists yet.
 */
export async function getCompanyProfileForSettings(
  session: MembershipSession,
): Promise<CompanyProfileView> {
  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const row = await withTenantContext(
    getDb(),
    { profileId, tenantId },
    async (db) => {
      return db.query.tenantCompanyProfiles.findFirst({
        where: eq(tenantCompanyProfiles.tenantId, tenantId),
      });
    },
  );

  if (!row) {
    return { tradingName: session.tenant.name };
  }

  const hours = parseBusinessHours(row.businessHours);

  return {
    ...(row.legalName ? { legalName: row.legalName } : {}),
    ...(row.tradingName ? { tradingName: row.tradingName } : { tradingName: session.tenant.name }),
    ...(row.taxId ? { taxId: row.taxId } : {}),
    ...(row.registrationNumber ? { registrationNumber: row.registrationNumber } : {}),
    ...(row.entityType ? { entityType: row.entityType as CompanyEntityType } : {}),
    ...(row.publicEmail ? { publicEmail: row.publicEmail } : {}),
    ...(row.publicPhone ? { publicPhone: row.publicPhone } : {}),
    ...(row.website ? { website: row.website } : {}),
    ...(row.registeredAddress ? { registeredAddress: row.registeredAddress } : {}),
    ...(row.showroomAddress ? { showroomAddress: row.showroomAddress } : {}),
    ...(row.city ? { city: row.city } : {}),
    ...(row.county ? { county: row.county } : {}),
    ...(row.country ? { country: row.country } : {}),
    ...(row.postalCode ? { postalCode: row.postalCode } : {}),
    ...(hours ? { businessHours: hours } : {}),
    ...(row.logoPath ? { logoPath: row.logoPath } : {}),
    ...(row.faviconPath ? { faviconPath: row.faviconPath } : {}),
    currency: (row.currency as CompanyCurrency) || "EUR",
    updatedAt: row.updatedAt.toISOString(),
  };
}
