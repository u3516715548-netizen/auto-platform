import type { NextConfig } from "next";

/**
 * Hostname only from public Supabase URL — no broad wildcards.
 * Signed object URLs live under /storage/v1/object/sign/...
 */
function supabaseStorageRemotePattern():
  | { protocol: "http" | "https"; hostname: string; pathname: string }
  | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    if (!parsed.hostname) return undefined;
    return {
      protocol: parsed.protocol === "http:" ? "http" : "https",
      hostname: parsed.hostname,
      pathname: "/storage/v1/object/sign/**",
    };
  } catch {
    return undefined;
  }
}

const storagePattern = supabaseStorageRemotePattern();

const nextConfig: NextConfig = {
  transpilePackages: [
    "@auto-platform/ui",
    "@auto-platform/types",
    "@auto-platform/core",
    "@auto-platform/db",
  ],
  images: {
    remotePatterns: storagePattern ? [storagePattern] : [],
  },
};

export default nextConfig;
