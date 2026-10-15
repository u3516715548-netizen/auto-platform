import {
  ALLOWED_EVENT_PARAM_KEYS,
  MARKETING_EVENT_SOURCE,
  type AllowedEventParamKey,
  type MarketingEventParams,
} from "@/lib/marketing/events-contract";

const ALLOWED_SET = new Set<string>(ALLOWED_EVENT_PARAM_KEYS);

/** Keys that must never appear even if somehow passed. */
const FORBIDDEN_SUBSTRINGS = [
  "email",
  "phone",
  "tel",
  "name",
  "message",
  "vin",
  "password",
  "token",
  "first_name",
  "last_name",
  "company_name",
  "tax_id",
  "cui",
] as const;

function isForbiddenKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (ALLOWED_SET.has(lower)) return false;
  return FORBIDDEN_SUBSTRINGS.some((f) => lower.includes(f));
}

/**
 * Whitelist + type coerce. Drops undefined/null/empty strings.
 * Never passes through unknown keys (PII-safe by construction).
 */
export function sanitizeMarketingEventParams(
  raw: Record<string, unknown> | MarketingEventParams | undefined,
): MarketingEventParams {
  const out: MarketingEventParams = {
    event_source: MARKETING_EVENT_SOURCE,
  };
  if (!raw) return out;

  for (const [key, value] of Object.entries(raw)) {
    if (isForbiddenKey(key)) continue;
    if (!ALLOWED_SET.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      // Hard cap to avoid accidentally stuffing large blobs.
      out[key as AllowedEventParamKey] = trimmed.slice(0, 200);
      continue;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      out[key as AllowedEventParamKey] = value;
      continue;
    }
    if (typeof value === "boolean") {
      out[key as AllowedEventParamKey] = value;
    }
  }

  out.event_source = MARKETING_EVENT_SOURCE;
  return out;
}

export function assertNoPiiInParams(params: MarketingEventParams): boolean {
  for (const key of Object.keys(params)) {
    if (isForbiddenKey(key) && key !== "tenant_slug" && !ALLOWED_SET.has(key)) {
      return false;
    }
    // tenant_slug is allowed; "name" as substring of tenant_slug key is fine.
  }
  // Ensure no value looks like an email.
  for (const value of Object.values(params)) {
    if (typeof value === "string" && /@/.test(value) && /\./.test(value)) {
      return false;
    }
  }
  return true;
}
