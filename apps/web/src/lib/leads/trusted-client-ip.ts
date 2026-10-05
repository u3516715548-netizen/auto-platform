import { createHash } from "node:crypto";

const IP_V4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IP_V6 = /^[0-9a-fA-F:]+$/;

function normalizeIpCandidate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 45) return null;
  if (IP_V4.test(trimmed)) return trimmed;
  if (trimmed.includes(":") && IP_V6.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

function firstForwardedFor(value: string): string | null {
  const first = value.split(",")[0]?.trim();
  if (!first) return null;
  return normalizeIpCandidate(first);
}

export type HeaderGetter = (name: string) => string | null;

/**
 * Client IP from trusted proxy headers only.
 * Never trust `X-Forwarded-For` on the public internet without a trusted edge (see VERCEL / TRUSTED_PROXY).
 */
export function getTrustedClientIp(getHeader: HeaderGetter): string | null {
  if (process.env.VERCEL === "1") {
    const vercelForwarded = getHeader("x-vercel-forwarded-for");
    if (vercelForwarded) {
      const ip = firstForwardedFor(vercelForwarded);
      if (ip) return ip;
    }
    const forwarded = getHeader("x-forwarded-for");
    if (forwarded) {
      const ip = firstForwardedFor(forwarded);
      if (ip) return ip;
    }
    return null;
  }

  if (process.env.TRUSTED_PROXY === "1") {
    const realIp = getHeader("x-real-ip");
    if (realIp) {
      const ip = normalizeIpCandidate(realIp);
      if (ip) return ip;
    }
    const forwarded = getHeader("x-forwarded-for");
    if (forwarded) {
      const ip = firstForwardedFor(forwarded);
      if (ip) return ip;
    }
  }

  return null;
}

/** One-way key for rate limiting — never persist or log the raw IP. */
export function hashClientIpForRateLimit(ip: string): string {
  const secret =
    process.env.LEAD_RATE_LIMIT_SECRET ??
    "local-dev-lead-rate-limit-not-for-production";
  return createHash("sha256").update(`${secret}|${ip}`).digest("hex").slice(0, 32);
}
