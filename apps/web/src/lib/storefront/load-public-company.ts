import { sql } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@auto-platform/db";
import {
  businessHoursSchema,
  companyCurrencySchema,
  companyEntityTypeSchema,
  type PublicCompanyView,
} from "@auto-platform/types";
import { clearPublicSessionGucs } from "./clear-public-session";

type PublicCompanyRow = {
  legal_name: string | null;
  trading_name: string | null;
  tax_id: string | null;
  registration_number: string | null;
  entity_type: string | null;
  public_email: string | null;
  public_phone: string | null;
  website: string | null;
  registered_address: string | null;
  showroom_address: string | null;
  city: string | null;
  county: string | null;
  country: string | null;
  postal_code: string | null;
  business_hours: unknown;
  logo_path: string | null;
  favicon_path: string | null;
  currency: string | null;
};

function toPublicCompanyView(row: PublicCompanyRow): PublicCompanyView {
  const entityParsed = row.entity_type
    ? companyEntityTypeSchema.safeParse(row.entity_type)
    : null;
  const currencyParsed = row.currency
    ? companyCurrencySchema.safeParse(row.currency)
    : null;
  const hoursParsed = businessHoursSchema.safeParse(row.business_hours ?? {});
  const hours =
    hoursParsed.success &&
    (hoursParsed.data.note ||
      ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].some(
        (d) => hoursParsed.data[d as keyof typeof hoursParsed.data] != null,
      ))
      ? hoursParsed.data
      : undefined;

  return {
    ...(row.legal_name ? { legalName: row.legal_name } : {}),
    ...(row.trading_name ? { tradingName: row.trading_name } : {}),
    ...(row.tax_id ? { taxId: row.tax_id } : {}),
    ...(row.registration_number ? { registrationNumber: row.registration_number } : {}),
    ...(entityParsed?.success ? { entityType: entityParsed.data } : {}),
    ...(row.public_email ? { publicEmail: row.public_email } : {}),
    ...(row.public_phone ? { publicPhone: row.public_phone } : {}),
    ...(row.website ? { website: row.website } : {}),
    ...(row.registered_address ? { registeredAddress: row.registered_address } : {}),
    ...(row.showroom_address ? { showroomAddress: row.showroom_address } : {}),
    ...(row.city ? { city: row.city } : {}),
    ...(row.county ? { county: row.county } : {}),
    ...(row.country ? { country: row.country } : {}),
    ...(row.postal_code ? { postalCode: row.postal_code } : {}),
    ...(hours ? { businessHours: hours } : {}),
    ...(row.logo_path ? { logoPath: row.logo_path } : {}),
    ...(row.favicon_path ? { faviconPath: row.favicon_path } : {}),
    ...(currencyParsed?.success ? { currency: currencyParsed.data } : {}),
  };
}

/**
 * Public company projection via SECURITY DEFINER — never SELECT full row as anon.
 * Returns null when no profile or tenant not publicly visible.
 */
export const loadPublicCompanyView = cache(
  async (tenantId: string): Promise<PublicCompanyView | null> => {
    const db = getDb();
    await clearPublicSessionGucs(db);

    const rows = await db.execute<PublicCompanyRow>(sql`
      select * from app.public_company_profile(${tenantId}::uuid)
    `);
    const list = Array.from(rows as unknown as PublicCompanyRow[]);
    const row = list[0];
    if (!row) return null;
    return toPublicCompanyView(row);
  },
);

/** Maps raw SECURITY DEFINER row (or null) for unit tests without DB. */
export function mapPublicCompanyRow(
  row: PublicCompanyRow | null,
): PublicCompanyView | null {
  if (!row) return null;
  return toPublicCompanyView(row);
}
