import { headers } from "next/headers";
import { cache } from "react";

/**
 * Absolute origin for the current Host (canonical / OG / sitemap / robots).
 * Host-only — never trusts query or client-provided tenant URLs.
 */
export const getPublicRequestOrigin = cache(async (): Promise<string> => {
  const headerStore = await headers();
  const rawHost =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const host = rawHost.split(",")[0]?.trim() || "localhost:3000";
  const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : host.includes("localhost") || host.startsWith("127.")
        ? "http"
        : "https";
  return `${proto}://${host}`;
});

/**
 * Resolves a brand asset path or https URL to an absolute https/http URL.
 * Rejects data/javascript and empty values.
 */
export function toAbsolutePublicAssetUrl(
  pathOrUrl: string | undefined | null,
  origin: string,
): string | undefined {
  if (!pathOrUrl) return undefined;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return undefined;
  if (/^(data:|javascript:|file:)/i.test(trimmed)) return undefined;
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^http:\/\//i.test(trimmed)) {
    // Allow http only for local/dev origins.
    if (origin.startsWith("http://")) return trimmed;
    return undefined;
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${origin}${path}`;
}

/**
 * True when a URL is suitable for OG / JSON-LD (stable, no signed-token query).
 * Signed Storage URLs expire and must not be used as social preview images.
 */
export function isStablePublicImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const q = parsed.search.toLowerCase();
    if (
      q.includes("token=") ||
      q.includes("signature=") ||
      q.includes("x-amz-") ||
      q.includes("sig=")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
