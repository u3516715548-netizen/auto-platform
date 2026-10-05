import { eq } from "drizzle-orm";
import { AuthRequiredError } from "@auto-platform/core";
import { getDb, profiles } from "@auto-platform/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = {
  authUserId: string;
  email: string | null;
  profile: {
    id: string;
    name: string;
    email: string;
  } | null;
};

/**
 * Returns the authenticated Auth user + optional profile row.
 * Uses supabase.auth.getUser() (server-validated JWT), not getSession() alone.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

  return {
    authUserId: user.id,
    email: user.email ?? null,
    profile: profile
      ? { id: profile.id, name: profile.name, email: profile.email }
      : null,
  };
}

export async function requireCurrentUser(): Promise<CurrentUser & { profile: NonNullable<CurrentUser["profile"]> }> {
  const current = await getCurrentUser();
  if (!current) {
    throw new AuthRequiredError();
  }
  if (!current.profile) {
    throw new AuthRequiredError("Profile missing for authenticated user");
  }
  return { ...current, profile: current.profile };
}
