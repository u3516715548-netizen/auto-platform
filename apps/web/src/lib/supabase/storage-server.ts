import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./server";
import { getPublicSupabaseEnv } from "./env";

/**
 * Authenticated Supabase client (staff session). Used for signed upload URLs
 * and object operations under Storage RLS.
 */
export async function createStaffSupabaseClient(): Promise<SupabaseClient> {
  return createSupabaseServerClient();
}

/**
 * Server-only Storage signing/admin client. Never import from Client Components.
 * Used for public signed download URLs after app-level `available` gate.
 * Optional: when unset, public image URLs are omitted (storefront still works).
 */
export function createStorageAdminClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) return null;
  const { url } = getPublicSupabaseEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
