"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (anon key). Minimal — no Auth UI in Etapa 3.
 * Prefer server utilities for membership / tenant checks.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createBrowserClient(url, anonKey);
}
