/**
 * Public Supabase env for Auth clients.
 * Never log values. Never use service_role here.
 */

export type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to apps/web/.env.local and fill public Supabase values.",
    );
  }

  return { url, anonKey };
}

export function getRootDomain(): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (!root) {
    throw new Error(
      "Missing NEXT_PUBLIC_ROOT_DOMAIN (e.g. localhost:3000). See .env.example.",
    );
  }
  return root.toLowerCase();
}
