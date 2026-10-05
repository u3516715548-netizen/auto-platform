import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Server Actions, Route Handlers.
 * Session is stored in cookies. Uses anon key only — never service_role.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Middleware refresh keeps the session alive.
        }
      },
    },
  });
}
