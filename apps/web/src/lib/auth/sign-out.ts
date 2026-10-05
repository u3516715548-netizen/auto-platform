"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginPath } from "./auth-redirects";

/**
 * Clears the Supabase Auth session cookies, then stays on the current host at /login.
 */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(loginPath());
}
