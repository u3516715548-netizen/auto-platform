import { eq, sql } from "drizzle-orm";
import { getDb, profiles } from "@auto-platform/db";
import { normalizeInvitationEmail } from "@auto-platform/types";

/**
 * Ensures a profiles row exists for the authenticated Auth user accepting an invite.
 * Sets only `app.profile_id` (no tenant yet) so profiles_insert_own can succeed.
 * Email must match the invitation (caller enforces); we normalize and reject mismatch.
 */
export async function ensureInviteProfile(input: {
  authUserId: string;
  authEmail: string | null;
  invitedEmail: string;
  displayName?: string | null;
}): Promise<{ profileId: string; email: string } | { error: "email_mismatch" | "invalid" }> {
  const invited = normalizeInvitationEmail(input.invitedEmail);
  const authEmail = input.authEmail ? normalizeInvitationEmail(input.authEmail) : null;
  if (!invited || !authEmail) {
    return { error: "invalid" };
  }
  if (invited !== authEmail) {
    return { error: "email_mismatch" };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: profiles.id, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, input.authUserId))
    .limit(1);

  if (existing) {
    const existingEmail = normalizeInvitationEmail(existing.email);
    if (existingEmail !== invited) {
      return { error: "email_mismatch" };
    }
    return { profileId: existing.id, email: existingEmail };
  }

  const name =
    input.displayName?.trim() ||
    invited.split("@")[0] ||
    "Membru";

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.profile_id', ${input.authUserId}, true)`);
      await tx.execute(sql`select set_config('app.tenant_id', '', true)`);
      await tx.insert(profiles).values({
        id: input.authUserId,
        name: name.slice(0, 120),
        email: invited,
      });
    });
  } catch {
    // Race: profile may have been created concurrently.
    const [again] = await db
      .select({ id: profiles.id, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, input.authUserId))
      .limit(1);
    if (!again) {
      return { error: "invalid" };
    }
    const againEmail = normalizeInvitationEmail(again.email);
    if (againEmail !== invited) {
      return { error: "email_mismatch" };
    }
    return { profileId: again.id, email: againEmail };
  }

  return { profileId: input.authUserId, email: invited };
}
