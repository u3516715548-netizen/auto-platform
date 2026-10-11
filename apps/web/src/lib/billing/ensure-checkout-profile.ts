import { eq, sql } from "drizzle-orm";
import { getDb, profiles } from "@auto-platform/db";
import { normalizeInvitationEmail } from "@auto-platform/types";

/**
 * Ensures profiles row for self-serve checkout (apex auth).
 * Same GUC pattern as invite signup — no tenant yet.
 */
export async function ensureCheckoutProfile(input: {
  authUserId: string;
  authEmail: string | null;
  displayName?: string | null;
}): Promise<{ profileId: string; email: string } | { error: "invalid" }> {
  const email = input.authEmail ? normalizeInvitationEmail(input.authEmail) : null;
  if (!email || !input.authUserId) {
    return { error: "invalid" };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: profiles.id, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, input.authUserId))
    .limit(1);

  if (existing) {
    return {
      profileId: existing.id,
      email: normalizeInvitationEmail(existing.email) || email,
    };
  }

  const name =
    input.displayName?.trim() || email.split("@")[0] || "Dealer";

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.profile_id', ${input.authUserId}, true)`);
      await tx.execute(sql`select set_config('app.tenant_id', '', true)`);
      await tx.insert(profiles).values({
        id: input.authUserId,
        name: name.slice(0, 120),
        email,
      });
    });
  } catch {
    const [again] = await db
      .select({ id: profiles.id, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, input.authUserId))
      .limit(1);
    if (!again) {
      return { error: "invalid" };
    }
    return {
      profileId: again.id,
      email: normalizeInvitationEmail(again.email) || email,
    };
  }

  return { profileId: input.authUserId, email };
}
