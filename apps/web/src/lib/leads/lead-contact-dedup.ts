import { and, eq, gte, or } from "drizzle-orm";
import { getDb, leads } from "@auto-platform/db";
import { clearPublicSessionGucs } from "@/lib/storefront/clear-public-session";

/** 1 lead / 30 minutes / tenant + vehicle + normalized contact */
export const LEAD_CONTACT_DEDUP_MS = 30 * 60 * 1000;

/**
 * Server-side dedup: recent lead with same tenant, vehicle, and email or phone.
 */
export async function hasRecentLeadForContact(
  tenantId: string,
  vehicleId: string,
  email: string | undefined,
  phone: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  const contactMatch = [];
  if (email) contactMatch.push(eq(leads.email, email));
  if (phone) contactMatch.push(eq(leads.phone, phone));
  if (contactMatch.length === 0) return false;

  const db = getDb();
  await clearPublicSessionGucs(db);

  const since = new Date(now - LEAD_CONTACT_DEDUP_MS);
  const [row] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, tenantId),
        eq(leads.vehicleId, vehicleId),
        gte(leads.createdAt, since),
        or(...contactMatch),
      ),
    )
    .limit(1);

  return Boolean(row);
}
