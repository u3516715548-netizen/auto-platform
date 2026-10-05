import { createHash } from "node:crypto";

const COOLDOWN_MS = 5 * 60 * 1000;
const COOKIE_PREFIX = "sf_lead_cd_";

export function leadCooldownMs(): number {
  return COOLDOWN_MS;
}

export function buildLeadCooldownCookieName(vehicleSlug: string, contactKey: string): string {
  const material = `${vehicleSlug}|${contactKey}`;
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 24);
  return `${COOKIE_PREFIX}${hash}`;
}

/** @deprecated Use normalizeLeadEmailForStorage from lead-contact */
export function normalizeLeadEmail(email: string | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isLeadCooldownActive(cookieValue: string | undefined, now = Date.now()): boolean {
  if (!cookieValue) return false;
  const ts = Number(cookieValue);
  if (!Number.isFinite(ts)) return false;
  return now - ts < COOLDOWN_MS;
}
